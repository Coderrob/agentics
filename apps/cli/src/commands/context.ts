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

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  ContextRefreshMode,
  buildContextCachePlan,
  parseContextClaims,
  type IContextCacheInput,
  type IContextCachePlan,
  type IContextClaim,
  type IContextFileEvidence,
} from '@agentics/agentics/context';
import { Command } from 'commander';
import type { ICommandRuntime } from '../runtime.js';
import { writeJson } from '../runtime.js';

/** Default target repository root. */
const DEFAULT_REPO_ROOT = '.';

/** Git command timeout in milliseconds. */
const GIT_TIMEOUT_MS = 10000;

/** Context claim registry path in target repositories. */
const CLAIMS_INDEX_PATH = '.agentics/context/claims/index.json';

/** Promisified execFile for Git commands. */
const execFileAsync = promisify(execFile);

/** Options shared by context cache commands. */
interface IContextCommandOptions {
  readonly label?: readonly string[];
  readonly repoRoot?: string;
}

/** Options for context claims command. */
interface IContextClaimsOptions extends IContextCommandOptions {
  readonly maxClaims?: number;
}

/** Git file metadata parsed from git ls-files. */
interface IGitFileMetadata {
  readonly blobOid: string;
  readonly path: string;
}

/**
 * Creates the context build action.
 * @param runtime - Runtime adapter used for command output.
 * @returns Commander action.
 */
function createBuildAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<IContextCommandOptions>) => Promise<void> {
  /**
   * Runs the context build action.
   * @param options - Context build options.
   */
  async function buildAction(options: Readonly<IContextCommandOptions>): Promise<void> {
    await handleContextCommand(options, ContextRefreshMode.Full, runtime);
  }

  return buildAction;
}

/**
 * Creates a context cache plan for a target repository.
 * @param options - Context command options.
 * @param mode - Context refresh mode.
 * @returns Context cache plan.
 */
async function createContextPlan(
  options: Readonly<IContextCommandOptions>,
  mode: Readonly<ContextRefreshMode>,
): Promise<IContextCachePlan> {
  const repoRoot = resolve(options.repoRoot ?? DEFAULT_REPO_ROOT);
  const files = await readGitFiles(repoRoot);
  const existingClaims = await readContextClaims(repoRoot);
  const input: IContextCacheInput = {
    changedPaths: [],
    existingClaims,
    files,
    labels: options.label ?? [],
    mode,
  };

  return buildContextCachePlan(input);
}

/**
 * Creates the context claims action.
 * @param runtime - Runtime adapter used for command output.
 * @returns Commander action.
 */
function createRefreshClaimsAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<IContextClaimsOptions>) => Promise<void> {
  /**
   * Runs the context claims action.
   * @param options - Context claims options.
   */
  async function refreshClaimsAction(options: Readonly<IContextClaimsOptions>): Promise<void> {
    await handleContextCommand(options, ContextRefreshMode.Claims, runtime);
  }

  return refreshClaimsAction;
}

/**
 * Creates the context summarize action.
 * @param runtime - Runtime adapter used for command output.
 * @returns Commander action.
 */
function createSummarizeAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<IContextCommandOptions>) => Promise<void> {
  /**
   * Runs the context summarize action.
   * @param options - Context summarize options.
   */
  async function summarizeAction(options: Readonly<IContextCommandOptions>): Promise<void> {
    await handleContextCommand(options, ContextRefreshMode.Summaries, runtime);
  }

  return summarizeAction;
}

/**
 * Creates the context validate action.
 * @param runtime - Runtime adapter used for command output.
 * @returns Commander action.
 */
function createValidateAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<IContextCommandOptions>) => Promise<void> {
  /**
   * Runs the context validate action.
   * @param options - Context validate options.
   */
  async function validateAction(options: Readonly<IContextCommandOptions>): Promise<void> {
    await handleContextCommand(options, ContextRefreshMode.Validate, runtime);
  }

  return validateAction;
}

/**
 * Runs a context command and writes JSON output.
 * @param options - Context command options.
 * @param mode - Context refresh mode.
 * @param runtime - Runtime adapter used for command output.
 */
async function handleContextCommand(
  options: Readonly<IContextCommandOptions>,
  mode: Readonly<ContextRefreshMode>,
  runtime: Readonly<ICommandRuntime>,
): Promise<void> {
  writeJson(runtime, await createContextPlan(options, mode));
}

/**
 * Checks whether file evidence was read successfully.
 * @param value - File evidence read result.
 * @returns True when the value contains file evidence.
 */
function isContextFileEvidence(value: IContextFileEvidence | undefined): value is IContextFileEvidence {
  return value !== undefined;
}

/**
 * Checks whether parsed Git metadata exists.
 * @param value - Parsed metadata.
 * @returns True when the value is file metadata.
 */
function isGitFileMetadata(value: IGitFileMetadata | undefined): value is IGitFileMetadata {
  return value !== undefined;
}

/**
 * Parses one git ls-files line.
 * @param line - Git output line.
 * @returns File evidence metadata without content, or undefined.
 */
function parseGitFileLine(line: string): IGitFileMetadata | undefined {
  const [metadata, path] = line.split('\t');
  const blobOid = metadata?.split(' ')[1];

  if (!blobOid || !path) {
    return undefined;
  }

  return { blobOid, path };
}

/**
 * Reads stored context claims from a target repository.
 * @param repoRoot - Target repository root.
 * @returns Parsed claims or an empty list.
 */
async function readContextClaims(repoRoot: string): Promise<readonly IContextClaim[]> {
  try {
    const content = await readFile(join(repoRoot, CLAIMS_INDEX_PATH), 'utf8');
    return parseContextClaims(JSON.parse(content));
  } catch {
    return [];
  }
}

/**
 * Reads one tracked file's content.
 * @param repoRoot - Target repository root.
 * @param file - Git file metadata.
 * @returns File evidence with content.
 */
async function readGitFileContent(
  repoRoot: string,
  file: Readonly<IGitFileMetadata>,
): Promise<IContextFileEvidence | undefined> {
  try {
    const content = await readFile(join(repoRoot, file.path), 'utf8');

    return {
      blobOid: file.blobOid,
      content,
      path: file.path,
    };
  } catch {
    return undefined;
  }
}

/**
 * Creates a file content reader bound to a repository root.
 * @param repoRoot - Target repository root.
 * @returns File content reader.
 */
function readGitFileContentForRepo(
  repoRoot: string,
): (file: Readonly<IGitFileMetadata>) => Promise<IContextFileEvidence | undefined> {
  /**
   * Reads one file from the bound repository root.
   * @param file - Git file metadata.
   * @returns File evidence.
   */
  async function readBoundGitFileContent(file: Readonly<IGitFileMetadata>): Promise<IContextFileEvidence | undefined> {
    return readGitFileContent(repoRoot, file);
  }

  return readBoundGitFileContent;
}

/**
 * Reads tracked Git files from a target repository.
 * @param repoRoot - Target repository root.
 * @returns File evidence for tracked files.
 */
async function readGitFiles(repoRoot: string): Promise<readonly IContextFileEvidence[]> {
  const { stdout } = await execFileAsync('git', ['-C', repoRoot, 'ls-files', '-s'], { timeout: GIT_TIMEOUT_MS });
  const files = stdout.split(/\r?\n/).map(parseGitFileLine).filter(isGitFileMetadata);

  return (await Promise.all(files.map(readGitFileContentForRepo(repoRoot)))).filter(isContextFileEvidence);
}

/**
 * Registers the context build command.
 * @param context - Parent context command.
 * @param runtime - Runtime adapter used for command output.
 */
function registerContextBuildCommand(context: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  context
    .command('build')
    .description('Dry-run full context cache artifact generation for a target repository')
    .option('-l, --label <label...>', 'State labels from an issue, pull request, or workflow event')
    .option('-r, --repo-root <path>', 'Target repository root', DEFAULT_REPO_ROOT)
    .action(createBuildAction(runtime));
}

/**
 * Registers the context claims command group.
 * @param context - Parent context command.
 * @param runtime - Runtime adapter used for command output.
 */
function registerContextClaimsCommand(context: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  context
    .command('claims')
    .description('Context cache claim commands')
    .command('refresh')
    .description('Dry-run git-pinned context claim refresh for a target repository')
    .option('-l, --label <label...>', 'State labels from an issue, pull request, or workflow event')
    .option('-m, --max-claims <number>', 'Reserved for future claim generation limits')
    .option('-r, --repo-root <path>', 'Target repository root', DEFAULT_REPO_ROOT)
    .action(createRefreshClaimsAction(runtime));
}

/**
 * Registers context cache commands.
 * @param program - Commander root program.
 * @param runtime - Runtime adapter used for command output.
 */
export function registerContextCommands(program: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  const context = program.command('context').description('Portable repository context cache commands');

  registerContextBuildCommand(context, runtime);
  registerContextClaimsCommand(context, runtime);
  registerContextSummarizeCommand(context, runtime);
  registerContextValidateCommand(context, runtime);
}

/**
 * Registers the context summarize command.
 * @param context - Parent context command.
 * @param runtime - Runtime adapter used for command output.
 */
function registerContextSummarizeCommand(context: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  context
    .command('summarize')
    .description('Dry-run recursive summary generation for a target repository')
    .option('-l, --label <label...>', 'State labels from an issue, pull request, or workflow event')
    .option('-r, --repo-root <path>', 'Target repository root', DEFAULT_REPO_ROOT)
    .action(createSummarizeAction(runtime));
}

/**
 * Registers the context validate command.
 * @param context - Parent context command.
 * @param runtime - Runtime adapter used for command output.
 */
function registerContextValidateCommand(context: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  context
    .command('validate')
    .description('Validate target repository context cache claims and summaries')
    .option('-l, --label <label...>', 'State labels from an issue, pull request, or workflow event')
    .option('-r, --repo-root <path>', 'Target repository root', DEFAULT_REPO_ROOT)
    .action(createValidateAction(runtime));
}
