// Copyright 2026 Robert Lindley
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { createHash } from 'node:crypto';
import { isArrayOf, isObject, isString } from '@coderrob/typescript-type-guards';

/** Default cache root written in target repositories. */
const CONTEXT_CACHE_ROOT = '.agentics/context';

/** Default claim author for deterministic helper output. */
const DEFAULT_CONTEXT_CLAIM_AUTHOR = 'agentics-context-cache';

/** Default claim creation timestamp used when no timestamp is provided. */
const DEFAULT_CONTEXT_TIMESTAMP = '1970-01-01T00:00:00.000Z';

/** Maximum line count sampled from file content for deterministic summaries. */
const SUMMARY_LINE_LIMIT = 3;

/** Maximum text length sampled from file content for deterministic summaries. */
const SUMMARY_TEXT_LIMIT = 180;

/** JSON indentation for generated artifacts. */
const JSON_INDENT = 2;

/** Portable repository root path marker. */
const ROOT_CONTEXT_PATH = '.';

/** Context cache artifact purpose. */
export enum ContextCacheArtifactPurpose {
  Claims = 'claims',
  Summaries = 'summaries',
  Validation = 'validation',
}

/** Context cache claim status. */
export enum ContextClaimStatus {
  Live = 'live',
  Stale = 'stale',
}

/** Context cache refresh mode. */
export enum ContextRefreshMode {
  Claims = 'claims',
  Full = 'full',
  Summaries = 'summaries',
  Validate = 'validate',
}

/** Context summary kind. */
export enum ContextSummaryKind {
  Directory = 'directory',
  File = 'file',
}

/** Proposed context cache artifact. */
export interface IContextCacheArtifact {
  readonly content: string;
  readonly path: string;
  readonly purpose: ContextCacheArtifactPurpose;
}

/** Context cache planning input. */
export interface IContextCacheInput {
  readonly changedPaths: readonly string[];
  readonly existingClaims: readonly IContextClaim[];
  readonly files: readonly IContextFileEvidence[];
  readonly generatedAt?: string;
  readonly labels: readonly string[];
  readonly mode: ContextRefreshMode;
}

/** Complete context cache plan. */
export interface IContextCachePlan {
  readonly artifacts: readonly IContextCacheArtifact[];
  readonly claims: readonly IContextClaim[];
  readonly liveClaims: readonly IContextClaim[];
  readonly staleClaims: readonly IContextClaim[];
  readonly stateSnapshot: IContextStateSnapshot;
  readonly summaries: readonly IContextSummary[];
  readonly validationErrors: readonly string[];
}

/** Claim evidence path pinned to a Git blob OID. */
export interface IEvidenceRef {
  readonly blobOid: string;
  readonly path: string;
}

/** Git-backed file evidence available from a target repository. */
export interface IContextFileEvidence extends IEvidenceRef {
  readonly content: string;
}

/** Git-pinned context claim. */
export interface IContextClaim {
  readonly claim: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly evidence: readonly IEvidenceRef[];
  readonly evidenceOid: string;
  readonly id: string;
  readonly status: ContextClaimStatus;
  readonly updatedAt: string;
}

/** Parsed label state snapshot. */
export interface IContextStateSnapshot {
  readonly priorityLabels: readonly string[];
  readonly stateLabels: readonly string[];
  readonly typeLabels: readonly string[];
  readonly workflowLabels: readonly string[];
}

/** Recursive repository summary. */
export interface IContextSummary {
  readonly blobOid?: string;
  readonly childPaths: readonly string[];
  readonly kind: ContextSummaryKind;
  readonly path: string;
  readonly summary: string;
  readonly updatedAt: string;
}

/**
 * Builds a portable context cache plan for a target repository snapshot.
 * @param input - Context cache input from a CLI, MCP server, or workflow.
 * @returns Proposed context cache artifacts and validation results.
 */
export function buildContextCachePlan(input: Readonly<IContextCacheInput>): IContextCachePlan {
  const generatedAt = input.generatedAt ?? DEFAULT_CONTEXT_TIMESTAMP;
  const summaries = createRecursiveSummaries(input.files, generatedAt);
  const refreshedClaims = refreshContextClaims(input.existingClaims, input.files, generatedAt);
  const liveClaims = refreshedClaims.filter(isLiveClaim);
  const staleClaims = refreshedClaims.filter(isStaleClaim);
  const stateSnapshot = createContextStateSnapshot(input.labels);
  const artifacts = createContextCacheArtifacts(summaries, refreshedClaims, stateSnapshot);
  const validationErrors = validateContextCache(summaries, refreshedClaims, input.files);

  return {
    artifacts,
    claims: refreshedClaims,
    liveClaims,
    staleClaims,
    stateSnapshot,
    summaries,
    validationErrors,
  };
}

/**
 * Collects ancestor directory paths for one path.
 * @param path - Repository path.
 * @returns Ancestor directory paths including repository root.
 */
function collectAncestorPaths(path: string): readonly string[] {
  const parts = normalizeContextPath(path).split('/').filter(isNonEmptyText);

  /**
   * Appends one ancestor path for a path segment index.
   * @param ancestors - Existing ancestor paths.
   * @param _part - Current path segment.
   * @param index - Current path segment index.
   * @returns Ancestor paths with the current parent path appended.
   */
  function appendAncestorPath(ancestors: readonly string[], _part: string, index: number): readonly string[] {
    return [...ancestors, parts.slice(0, index).join('/') || ROOT_CONTEXT_PATH];
  }

  return parts.reduce<readonly string[]>(appendAncestorPath, []);
}

/**
 * Collects unique directory paths from files.
 * @param files - Source files.
 * @returns Sorted unique directory paths.
 */
function collectDirectoryPaths(files: readonly IContextFileEvidence[]): readonly string[] {
  return files.flatMap(collectFileAncestorPaths).reduce<readonly string[]>(insertSortedUnique, []);
}

/**
 * Collects ancestor paths for one file.
 * @param file - File evidence.
 * @returns Ancestor paths.
 */
function collectFileAncestorPaths(file: Readonly<IContextFileEvidence>): readonly string[] {
  return collectAncestorPaths(file.path);
}

/**
 * Compares evidence references by path.
 * @param left - Left evidence ref.
 * @param right - Right evidence ref.
 * @returns Sort comparison result.
 */
function compareEvidenceRef(left: Readonly<IEvidenceRef>, right: Readonly<IEvidenceRef>): number {
  return left.path.localeCompare(right.path);
}

/**
 * Compares summaries by path.
 * @param left - Left summary.
 * @param right - Right summary.
 * @returns Sort comparison result.
 */
function compareSummary(left: Readonly<IContextSummary>, right: Readonly<IContextSummary>): number {
  return left.path.localeCompare(right.path);
}

/**
 * Computes a stable evidence OID from sorted path/blob pairs.
 * @param evidence - Evidence refs to hash.
 * @returns Stable SHA-256 evidence OID.
 */
export function computeEvidenceOid(evidence: readonly IEvidenceRef[]): string {
  const payload = evidence.reduce<readonly IEvidenceRef[]>(insertEvidenceRef, []).map(renderEvidenceRef).join('\n');
  return hashText(payload);
}

/**
 * Creates proposed context cache artifacts from computed cache state.
 * @param summaries - Recursive summaries.
 * @param claims - Git-pinned claims.
 * @param stateSnapshot - Parsed label state.
 * @returns Proposed target repository artifacts.
 */
export function createContextCacheArtifacts(
  summaries: readonly IContextSummary[],
  claims: readonly IContextClaim[],
  stateSnapshot: Readonly<IContextStateSnapshot>,
): readonly IContextCacheArtifact[] {
  return [
    {
      content: renderSummaryIndex(summaries),
      path: `${CONTEXT_CACHE_ROOT}/summaries/index.json`,
      purpose: ContextCacheArtifactPurpose.Summaries,
    },
    {
      content: renderClaimsIndex(claims),
      path: `${CONTEXT_CACHE_ROOT}/claims/index.json`,
      purpose: ContextCacheArtifactPurpose.Claims,
    },
    {
      content: renderValidationReport(claims, stateSnapshot),
      path: `${CONTEXT_CACHE_ROOT}/validation.json`,
      purpose: ContextCacheArtifactPurpose.Validation,
    },
  ];
}

/**
 * Creates a parsed state snapshot from repository labels.
 * @param labels - Labels from an issue, pull request, or workflow event.
 * @returns Label state grouped by purpose.
 */
export function createContextStateSnapshot(labels: readonly string[]): IContextStateSnapshot {
  return {
    priorityLabels: labels.filter(isPriorityLabel),
    stateLabels: labels.filter(isStateLabel),
    typeLabels: labels.filter(isTypeLabel),
    workflowLabels: labels.filter(isContextWorkflowLabel),
  };
}

/**
 * Creates directory summaries for source files.
 * @param files - Source files.
 * @param updatedAt - Summary timestamp.
 * @returns Directory summaries.
 */
function createDirectorySummaries(
  files: readonly IContextFileEvidence[],
  updatedAt: string,
): readonly IContextSummary[] {
  /**
   * Creates a directory summary for one directory path.
   * @param path - Directory path.
   * @returns Directory summary.
   */
  function createSourceDirectorySummary(path: string): IContextSummary {
    return createDirectorySummary(path, files, updatedAt);
  }

  return collectDirectoryPaths(files).map(createSourceDirectorySummary);
}

/**
 * Creates a directory summary from direct child paths.
 * @param path - Directory path.
 * @param files - Source files.
 * @param updatedAt - Summary timestamp.
 * @returns Directory summary.
 */
function createDirectorySummary(
  path: string,
  files: readonly IContextFileEvidence[],
  updatedAt: string,
): IContextSummary {
  const childPaths = findDirectChildPaths(path, files);

  return {
    childPaths,
    kind: ContextSummaryKind.Directory,
    path,
    summary: `Directory ${path} contains ${String(childPaths.length)} direct cached paths.`,
    updatedAt,
  };
}

/**
 * Creates file summaries for source files.
 * @param files - Source files.
 * @param updatedAt - Summary timestamp.
 * @returns File summaries.
 */
function createFileSummaries(files: readonly IContextFileEvidence[], updatedAt: string): readonly IContextSummary[] {
  /**
   * Creates a summary for one source file.
   * @param file - Source file.
   * @returns File summary.
   */
  function createSourceFileSummary(file: Readonly<IContextFileEvidence>): IContextSummary {
    return createFileSummary(file, updatedAt);
  }

  return files.map(createSourceFileSummary);
}

/**
 * Creates a file summary from file content.
 * @param file - File evidence.
 * @param updatedAt - Summary timestamp.
 * @returns File summary.
 */
function createFileSummary(file: Readonly<IContextFileEvidence>, updatedAt: string): IContextSummary {
  return {
    blobOid: file.blobOid,
    childPaths: [],
    kind: ContextSummaryKind.File,
    path: normalizeContextPath(file.path),
    summary: summarizeFileContent(file.content),
    updatedAt,
  };
}

/**
 * Creates a stable hash for a repository path.
 * @param path - Repository path.
 * @returns Stable path hash.
 */
export function createPathHash(path: string): string {
  return hashText(path);
}

/**
 * Builds recursive summaries for file and directory paths.
 * @param files - Git-backed file evidence with content.
 * @param updatedAt - Timestamp to record in summaries.
 * @returns Recursive context summaries.
 */
export function createRecursiveSummaries(
  files: readonly IContextFileEvidence[],
  updatedAt = DEFAULT_CONTEXT_TIMESTAMP,
): readonly IContextSummary[] {
  const sourceFiles = files
    .filter(isIncludedContextFile)
    .reduce<readonly IContextFileEvidence[]>(insertFileEvidence, []);
  const fileSummaries = createFileSummaries(sourceFiles, updatedAt);
  const directorySummaries = createDirectorySummaries(sourceFiles, updatedAt);

  return [...directorySummaries, ...fileSummaries].reduce<readonly IContextSummary[]>(insertSummary, []);
}

/**
 * Creates a baseline repository claim.
 * @param files - Current target repository files.
 * @param generatedAt - Claim timestamp.
 * @returns Baseline context claim.
 */
function createRepositoryClaim(files: readonly IContextFileEvidence[], generatedAt: string): IContextClaim {
  const evidence = files
    .filter(isIncludedContextFile)
    .reduce<readonly IContextFileEvidence[]>(insertFileEvidence, [])
    .map(toEvidenceRef)
    .slice(0, SUMMARY_LINE_LIMIT);

  return {
    claim: `Repository context cache covers ${String(files.length)} tracked files.`,
    createdAt: generatedAt,
    createdBy: DEFAULT_CONTEXT_CLAIM_AUTHOR,
    evidence,
    evidenceOid: computeEvidenceOid(evidence),
    id: createPathHash('repository-context-coverage'),
    status: ContextClaimStatus.Live,
    updatedAt: generatedAt,
  };
}

/**
 * Finds the direct child path for a file under a directory.
 * @param directoryPath - Directory path to inspect.
 * @param filePath - File path.
 * @returns Direct child path or empty string.
 */
function findDirectChildPath(directoryPath: string, filePath: string): string {
  const normalizedDirectory = normalizeContextPath(directoryPath);
  const normalizedFile = normalizeContextPath(filePath);
  const prefix = normalizedDirectory === ROOT_CONTEXT_PATH ? '' : `${normalizedDirectory}/`;

  if (!normalizedFile.startsWith(prefix)) {
    return '';
  }

  const remainder = normalizedFile.slice(prefix.length);
  const firstPart = remainder.split('/')[0] ?? '';

  return firstPart.length > 0 ? `${prefix}${firstPart}` : '';
}

/**
 * Finds direct child paths for a directory.
 * @param directoryPath - Directory path to inspect.
 * @param files - Source files.
 * @returns Sorted direct child paths.
 */
function findDirectChildPaths(directoryPath: string, files: readonly IContextFileEvidence[]): readonly string[] {
  /**
   * Finds the direct child for one file.
   * @param file - File evidence.
   * @returns Direct child path or empty string.
   */
  function findFileDirectChildPath(file: Readonly<IContextFileEvidence>): string {
    return findDirectChildPath(directoryPath, file.path);
  }

  return files.map(findFileDirectChildPath).filter(isNonEmptyText).reduce<readonly string[]>(insertSortedUnique, []);
}

/**
 * Finds current evidence for a path.
 * @param path - Evidence path.
 * @param files - Current file evidence.
 * @returns Matching evidence or undefined.
 */
function findFileEvidence(path: string, files: readonly IContextFileEvidence[]): IContextFileEvidence | undefined {
  /**
   * Checks whether one file matches the requested path.
   * @param file - File evidence.
   * @returns True when the file path matches.
   */
  function isMatchingPath(file: Readonly<IContextFileEvidence>): boolean {
    return normalizeContextPath(file.path) === normalizeContextPath(path);
  }

  return files.find(isMatchingPath);
}

/**
 * Hashes text using SHA-256.
 * @param value - Text to hash.
 * @returns Hex digest.
 */
function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Inserts an evidence ref into a sorted immutable list.
 * @param values - Existing evidence values.
 * @param value - Evidence value to insert.
 * @returns Sorted evidence values.
 */
function insertEvidenceRef<T extends IEvidenceRef>(values: readonly T[], value: Readonly<T>): readonly T[] {
  /**
   * Checks whether a current value sorts after the inserted value.
   * @param current - Current evidence value.
   * @returns True when current sorts after value.
   */
  function isAfterValue(current: Readonly<T>): boolean {
    return compareEvidenceRef(current, value) > 0;
  }

  /**
   * Checks whether a current value sorts before or at the inserted value.
   * @param current - Current evidence value.
   * @returns True when current sorts before or at value.
   */
  function isBeforeOrSameValue(current: Readonly<T>): boolean {
    return compareEvidenceRef(current, value) <= 0;
  }

  return [...values.filter(isBeforeOrSameValue), value, ...values.filter(isAfterValue)];
}

/**
 * Inserts file evidence into a sorted immutable list.
 * @param values - Existing file evidence values.
 * @param value - File evidence value to insert.
 * @returns Sorted file evidence values.
 */
function insertFileEvidence(
  values: readonly IContextFileEvidence[],
  value: Readonly<IContextFileEvidence>,
): readonly IContextFileEvidence[] {
  return insertEvidenceRef(values, value);
}

/**
 * Inserts a value into a sorted unique string list.
 * @param values - Existing values.
 * @param value - Value to insert.
 * @returns Sorted unique values.
 */
function insertSortedUnique(values: readonly string[], value: string): readonly string[] {
  if (values.includes(value)) {
    return values;
  }

  /**
   * Checks whether a current value sorts after the inserted value.
   * @param current - Current value.
   * @returns True when current sorts after value.
   */
  function isAfterValue(current: string): boolean {
    return current.localeCompare(value) > 0;
  }

  /**
   * Checks whether a current value sorts before or at the inserted value.
   * @param current - Current value.
   * @returns True when current sorts before or at value.
   */
  function isBeforeOrSameValue(current: string): boolean {
    return current.localeCompare(value) <= 0;
  }

  return [...values.filter(isBeforeOrSameValue), value, ...values.filter(isAfterValue)];
}

/**
 * Inserts a summary into a sorted immutable list.
 * @param values - Existing summaries.
 * @param value - Summary to insert.
 * @returns Sorted summaries.
 */
function insertSummary(
  values: readonly IContextSummary[],
  value: Readonly<IContextSummary>,
): readonly IContextSummary[] {
  /**
   * Checks whether a current summary sorts after the inserted value.
   * @param current - Current summary.
   * @returns True when current sorts after value.
   */
  function isAfterValue(current: Readonly<IContextSummary>): boolean {
    return compareSummary(current, value) > 0;
  }

  /**
   * Checks whether a current summary sorts before or at the inserted value.
   * @param current - Current summary.
   * @returns True when current sorts before or at value.
   */
  function isBeforeOrSameValue(current: Readonly<IContextSummary>): boolean {
    return compareSummary(current, value) <= 0;
  }

  return [...values.filter(isBeforeOrSameValue), value, ...values.filter(isAfterValue)];
}

/**
 * Checks whether a claim object is valid.
 * @param value - Unknown value.
 * @returns True when the value is a context claim.
 */
function isContextClaim(value: unknown): value is IContextClaim {
  if (!isObject(value)) {
    return false;
  }

  const { claim, createdAt, createdBy, evidence, evidenceOid, id, status, updatedAt } = value;

  return (
    isString(claim) &&
    isString(createdAt) &&
    isString(createdBy) &&
    isArrayOf(isEvidenceRef)(evidence) &&
    isString(evidenceOid) &&
    isString(id) &&
    isString(status) &&
    isString(updatedAt)
  );
}

/**
 * Checks whether a label is a context workflow label.
 * @param label - Label to inspect.
 * @returns True when the label is context workflow state.
 */
function isContextWorkflowLabel(label: string): boolean {
  return label.startsWith('context-cache:');
}

/**
 * Checks whether a value is evidence.
 * @param value - Unknown value.
 * @returns True when the value is evidence.
 */
function isEvidenceRef(value: unknown): value is IEvidenceRef {
  if (!isObject(value)) {
    return false;
  }

  return isString(value.blobOid) && isString(value.path);
}

/**
 * Checks whether a file should be included in the portable context cache.
 * @param file - File to inspect.
 * @returns True when the file should be summarized.
 */
function isIncludedContextFile(file: Readonly<IEvidenceRef>): boolean {
  const normalized = normalizeContextPath(file.path);
  const excludedPrefixes = ['.agentics/context/', '.git/', 'build/', 'coverage/', 'dist/', 'node_modules/', 'site/'];

  /**
   * Checks whether the normalized path starts with one excluded prefix.
   * @param prefix - Excluded prefix.
   * @returns True when the file path is excluded by this prefix.
   */
  function isExcludedPrefix(prefix: string): boolean {
    return normalized.startsWith(prefix);
  }

  return !excludedPrefixes.some(isExcludedPrefix) && !normalized.endsWith('.lock.yml');
}

/**
 * Checks whether a claim is live.
 * @param claim - Claim to inspect.
 * @returns True when the claim is live.
 */
function isLiveClaim(claim: Readonly<IContextClaim>): boolean {
  return claim.status === ContextClaimStatus.Live;
}

/**
 * Creates a missing evidence predicate.
 * @param files - Current file evidence.
 * @returns Missing evidence predicate.
 */
function isMissingClaimEvidence(files: readonly IContextFileEvidence[]): (evidence: Readonly<IEvidenceRef>) => boolean {
  /**
   * Checks whether one evidence ref is missing.
   * @param evidence - Evidence ref to inspect.
   * @returns True when evidence path is missing.
   */
  function isMissingEvidence(evidence: Readonly<IEvidenceRef>): boolean {
    return !findFileEvidence(evidence.path, files);
  }

  return isMissingEvidence;
}

/**
 * Checks whether text is non-empty.
 * @param value - Text to inspect.
 * @returns True when the value is non-empty.
 */
function isNonEmptyText(value: string): boolean {
  return value.length > 0;
}

/**
 * Checks whether a label is a priority label.
 * @param label - Label to inspect.
 * @returns True when the label is priority state.
 */
function isPriorityLabel(label: string): boolean {
  return label.startsWith('priority:');
}

/**
 * Checks whether a claim is stale.
 * @param claim - Claim to inspect.
 * @returns True when the claim is stale.
 */
function isStaleClaim(claim: Readonly<IContextClaim>): boolean {
  return claim.status === ContextClaimStatus.Stale;
}

/**
 * Checks whether a label is a lifecycle state label.
 * @param label - Label to inspect.
 * @returns True when the label is lifecycle state.
 */
function isStateLabel(label: string): boolean {
  return label.startsWith('state:');
}

/**
 * Checks whether a label is a type label.
 * @param label - Label to inspect.
 * @returns True when the label is type state.
 */
function isTypeLabel(label: string): boolean {
  return label.startsWith('type:');
}

/**
 * Normalizes repository paths to portable slash paths.
 * @param path - Path to normalize.
 * @returns Normalized repository path.
 */
function normalizeContextPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/g, '') || ROOT_CONTEXT_PATH;
}

/**
 * Parses stored context claims from JSON data.
 * @param data - Unknown JSON data.
 * @returns Parsed claims; invalid entries are ignored.
 */
export function parseContextClaims(data: unknown): readonly IContextClaim[] {
  if (!isObject(data)) {
    return [];
  }

  const { claims } = data;

  if (!isArrayOf(isContextClaim)(claims)) {
    return [];
  }

  return claims;
}

/**
 * Refreshes existing claims and creates a baseline claim when no claims exist.
 * @param existingClaims - Existing context claims.
 * @param files - Current target repository file evidence.
 * @param generatedAt - Timestamp to record in refreshed claims.
 * @returns Refreshed claims with live or stale status.
 */
export function refreshContextClaims(
  existingClaims: readonly IContextClaim[],
  files: readonly IContextFileEvidence[],
  generatedAt = DEFAULT_CONTEXT_TIMESTAMP,
): readonly IContextClaim[] {
  /**
   * Refreshes one existing claim.
   * @param claim - Existing claim.
   * @returns Refreshed claim.
   */
  function refreshClaim(claim: Readonly<IContextClaim>): IContextClaim {
    return refreshExistingClaim(claim, files, generatedAt);
  }

  if (existingClaims.length > 0) {
    return existingClaims.map(refreshClaim);
  }

  return [createRepositoryClaim(files, generatedAt)];
}

/**
 * Refreshes one evidence ref.
 * @param evidence - Existing evidence.
 * @param files - Current file evidence.
 * @returns Refreshed evidence or undefined.
 */
function refreshEvidence(
  evidence: Readonly<IEvidenceRef>,
  files: readonly IContextFileEvidence[],
): IEvidenceRef | undefined {
  const file = findFileEvidence(evidence.path, files);

  if (!file) {
    return undefined;
  }

  return toEvidenceRef(file);
}

/**
 * Refreshes a stored claim against current file evidence.
 * @param claim - Existing claim.
 * @param files - Current file evidence.
 * @param generatedAt - Refresh timestamp.
 * @returns Refreshed claim.
 */
function refreshExistingClaim(
  claim: Readonly<IContextClaim>,
  files: readonly IContextFileEvidence[],
  generatedAt: string,
): IContextClaim {
  /**
   * Refreshes one claim evidence ref with the current file set.
   * @param evidence - Evidence to refresh.
   * @returns Refreshed evidence or undefined.
   */
  function refreshClaimEvidence(evidence: Readonly<IEvidenceRef>): IEvidenceRef | undefined {
    return refreshEvidence(evidence, files);
  }

  const refreshedEvidence = claim.evidence.map(refreshClaimEvidence);
  const live = refreshedEvidence.every(isEvidenceRef);
  const evidence = refreshedEvidence.filter(isEvidenceRef);
  const evidenceOid = computeEvidenceOid(evidence);
  const status = live && evidenceOid === claim.evidenceOid ? ContextClaimStatus.Live : ContextClaimStatus.Stale;

  return {
    ...claim,
    evidence,
    evidenceOid,
    status,
    updatedAt: generatedAt,
  };
}

/**
 * Renders a claims index artifact.
 * @param claims - Claims to render.
 * @returns JSON content.
 */
function renderClaimsIndex(claims: readonly IContextClaim[]): string {
  return `${JSON.stringify({ claims }, null, JSON_INDENT)}\n`;
}

/**
 * Renders one evidence reference for hashing.
 * @param evidence - Evidence ref.
 * @returns Stable evidence line.
 */
function renderEvidenceRef(evidence: Readonly<IEvidenceRef>): string {
  return `${normalizeContextPath(evidence.path)}\0${evidence.blobOid}`;
}

/**
 * Creates a missing evidence error renderer.
 * @param claim - Claim containing the missing evidence.
 * @returns Missing evidence error renderer.
 */
function renderMissingEvidenceError(claim: Readonly<IContextClaim>): (evidence: Readonly<IEvidenceRef>) => string {
  /**
   * Renders one missing evidence error.
   * @param evidence - Missing evidence.
   * @returns Validation error.
   */
  function renderError(evidence: Readonly<IEvidenceRef>): string {
    return `Missing evidence path for claim ${claim.id}: ${evidence.path}`;
  }

  return renderError;
}

/**
 * Renders a summary index artifact.
 * @param summaries - Summaries to render.
 * @returns JSON content.
 */
function renderSummaryIndex(summaries: readonly IContextSummary[]): string {
  return `${JSON.stringify({ summaries }, null, JSON_INDENT)}\n`;
}

/**
 * Renders context cache validation output.
 * @param claims - Claims to count.
 * @param stateSnapshot - Parsed label state.
 * @returns JSON content.
 */
function renderValidationReport(
  claims: readonly IContextClaim[],
  stateSnapshot: Readonly<IContextStateSnapshot>,
): string {
  return `${JSON.stringify(
    {
      labels: stateSnapshot,
      liveClaims: claims.filter(isLiveClaim).length,
      staleClaims: claims.filter(isStaleClaim).length,
    },
    null,
    JSON_INDENT,
  )}\n`;
}

/**
 * Selects claims that are safe to inject into agent context.
 * @param claims - Claims to filter.
 * @returns Live claims only.
 */
export function selectLiveContextClaims(claims: readonly IContextClaim[]): readonly IContextClaim[] {
  return claims.filter(isLiveClaim);
}

/**
 * Summarizes file content deterministically.
 * @param content - File content.
 * @returns Short file summary.
 */
function summarizeFileContent(content: string): string {
  const sample = content
    .split(/\r?\n/)
    .map(trimText)
    .filter(isNonEmptyText)
    .slice(0, SUMMARY_LINE_LIMIT)
    .join(' ')
    .slice(0, SUMMARY_TEXT_LIMIT);

  return sample.length > 0 ? sample : 'Empty or whitespace-only file.';
}

/**
 * Converts file evidence to claim evidence.
 * @param file - File evidence.
 * @returns Claim evidence.
 */
function toEvidenceRef(file: Readonly<IContextFileEvidence>): IEvidenceRef {
  return {
    blobOid: file.blobOid,
    path: file.path,
  };
}

/**
 * Trims text.
 * @param value - Text to trim.
 * @returns Trimmed text.
 */
function trimText(value: string): string {
  return value.trim();
}

/**
 * Validates context cache state.
 * @param summaries - Recursive summaries.
 * @param claims - Context claims.
 * @param files - Current target repository file evidence.
 * @returns Validation errors.
 */
export function validateContextCache(
  summaries: readonly IContextSummary[],
  claims: readonly IContextClaim[],
  files: readonly IContextFileEvidence[],
): readonly string[] {
  /**
   * Validates one claim against the provided files.
   * @param claim - Claim to validate.
   * @returns Validation errors.
   */
  function validateClaim(claim: Readonly<IContextClaim>): readonly string[] {
    return validateContextClaim(claim, files);
  }

  return [...validateContextSummaries(summaries), ...claims.flatMap(validateClaim)];
}

/**
 * Validates one context claim.
 * @param claim - Claim to validate.
 * @param files - Current file evidence.
 * @returns Validation errors.
 */
function validateContextClaim(
  claim: Readonly<IContextClaim>,
  files: readonly IContextFileEvidence[],
): readonly string[] {
  const missingEvidence = claim.evidence.filter(isMissingClaimEvidence(files)).map(renderMissingEvidenceError(claim));
  const expectedEvidenceOid = computeEvidenceOid(claim.evidence);
  const oidErrors = expectedEvidenceOid === claim.evidenceOid ? [] : [`Evidence OID mismatch for claim ${claim.id}.`];

  return [...missingEvidence, ...oidErrors];
}

/**
 * Validates recursive summaries.
 * @param summaries - Summaries to validate.
 * @returns Validation errors.
 */
function validateContextSummaries(summaries: readonly IContextSummary[]): readonly string[] {
  if (summaries.length > 0) {
    return [];
  }

  return ['At least one context summary is required.'];
}
