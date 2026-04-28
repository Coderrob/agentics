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

import type { IConversationAnalysis } from '@agentics/ai';
import { createProvider } from '@agentics/ai';
import { compileWorkflowCommand, downloadArtifactsCommand, runWorkflowCommand } from '@agentics/github';

/** Default directory for storing workflow run refinement artifacts. */
const DEFAULT_REFINEMENTS_DIR = 'refinements';

/** Default label applied to workflow factory requests. */
const DEFAULT_WORKFLOW_LABEL = 'workflow';

/** Default workflow factory author when no issue author is provided. */
const DEFAULT_WORKFLOW_REQUEST_AUTHOR = 'unknown';

/** Default workflow factory issue number when no issue number is provided. */
const DEFAULT_WORKFLOW_REQUEST_ISSUE_NUMBER = 0;

/** Default workflow factory request text when no body is provided. */
const DEFAULT_WORKFLOW_REQUEST_TEXT = 'Define a new Agentics workflow.';

/** Default workflow factory title when no issue title is provided. */
const DEFAULT_WORKFLOW_REQUEST_TITLE = 'workflow: generated workflow';

/** Maximum generated workflow name length. */
const MAX_WORKFLOW_NAME_LENGTH = 48;

/** Workflow factory category for generated workflow specs. */
export enum WorkflowCategory {
  Analysis = 'analysis',
  Evaluation = 'evaluation',
  Generation = 'generation',
  Refinement = 'refinement',
}

/** Workflow factory generated artifact purpose. */
export enum WorkflowFactoryArtifactPurpose {
  Docs = 'docs',
  McpTool = 'mcp-tool',
  Test = 'test',
  Workflow = 'workflow',
}

/** Workflow factory capability author. */
export enum WorkflowFactoryCapabilityAuthor {
  Agent = 'agent',
  Human = 'human',
}

/** Paths to workflow run artifact files. */
export interface IArtifactPaths {
  readonly baseDir: string;
  readonly conversation: string;
  readonly prompt: string;
  readonly usage: string;
}

/** Shell commands needed to execute a workflow refinement lifecycle. */
export interface IRefinementCommands {
  readonly compile: string;
  readonly downloadArtifacts: string;
  readonly run: string;
}

/** Complete refinement plan for a workflow run. */
export interface IRefinementPlan {
  readonly artifactPaths: IArtifactPaths;
  readonly commands: IRefinementCommands;
  readonly runId: string;
  readonly workflowPath: string;
}

/** Reusable workflow factory capability definition. */
export interface ICapabilityDefinition {
  readonly capability: string;
  readonly createdBy: WorkflowFactoryCapabilityAuthor;
  readonly name: string;
  readonly suppression: readonly string[];
  readonly toolPath: string;
  readonly triggers: readonly string[];
  readonly version: string;
}

/** Generated workflow artifact proposal. */
export interface IGeneratedWorkflowArtifact {
  readonly content: string;
  readonly path: string;
  readonly purpose: WorkflowFactoryArtifactPurpose;
}

/** Workflow factory request parsed from an issue. */
export interface IWorkflowRequest {
  readonly author: string;
  readonly body: string;
  readonly issueNumber: number;
  readonly labels: readonly string[];
  readonly requestText: string;
  readonly title: string;
}

/** Workflow factory request parser boundary. */
export interface IWorkflowRequestParser {
  parse(issue: Readonly<IWorkflowRequest>): IWorkflowSpec;
}

/** Workflow factory artifact renderer boundary. */
export interface IWorkflowArtifactRenderer {
  render(spec: Readonly<IWorkflowSpec>): readonly IGeneratedWorkflowArtifact[];
}

/** Workflow factory capability registry boundary. */
export interface IWorkflowCapabilityRegistry {
  list(): readonly ICapabilityDefinition[];
  register(definition: Readonly<ICapabilityDefinition>): void;
}

/** Workflow factory validation boundary. */
export interface IWorkflowFactoryValidator {
  validate(spec: Readonly<IWorkflowSpec>, artifacts: readonly IGeneratedWorkflowArtifact[]): readonly string[];
}

/** Workflow factory dry-run result. */
export interface IWorkflowFactoryPlan {
  readonly artifacts: readonly IGeneratedWorkflowArtifact[];
  readonly request: IWorkflowRequest;
  readonly spec: IWorkflowSpec;
  readonly validationErrors: readonly string[];
}

/** Workflow factory generated workflow specification. */
export interface IWorkflowSpec {
  readonly acceptanceCriteria: readonly string[];
  readonly category: WorkflowCategory;
  readonly description: string;
  readonly inputs: Readonly<Record<string, string>>;
  readonly mcpTools: readonly string[];
  readonly name: string;
  readonly outputs: Readonly<Record<string, string>>;
  readonly permissions: Readonly<Record<string, string>>;
  readonly safeOutputs: readonly string[];
  readonly steps: readonly string[];
}

/**
 * Runs conversation analysis using the default AI provider.
 * @param content - The conversation transcript text to analyze.
 * @returns Analysis findings including redundant patterns and recommendations.
 */
export function analyzeConversation(content: string): IConversationAnalysis {
  const provider = createProvider();
  return provider.analyzeConversation(content);
}

/**
 * Appends an error when a required collection is empty.
 * @param errors - Existing validation errors.
 * @param collection - Collection to validate.
 * @param message - Error message to append when empty.
 * @returns Updated validation errors.
 */
function appendCollectionError(
  errors: readonly string[],
  collection: readonly unknown[],
  message: string,
): readonly string[] {
  if (collection.length > 0) {
    return errors;
  }

  return [...errors, message];
}

/**
 * Appends an error when a required record is empty.
 * @param errors - Existing validation errors.
 * @param record - Record to validate.
 * @param message - Error message to append when empty.
 * @returns Updated validation errors.
 */
function appendRecordError(
  errors: readonly string[],
  record: Readonly<Record<string, string>>,
  message: string,
): readonly string[] {
  if (Object.keys(record).length > 0) {
    return errors;
  }

  return [...errors, message];
}

/**
 * Appends an error when a required string is empty.
 * @param errors - Existing validation errors.
 * @param value - String value to validate.
 * @param message - Error message to append when empty.
 * @returns Updated validation errors.
 */
function appendStringError(errors: readonly string[], value: string, message: string): readonly string[] {
  if (value.length > 0) {
    return errors;
  }

  return [...errors, message];
}

/**
 * Returns the expected artifact file paths for a given run ID.
 * @param runId - The workflow run ID.
 * @param refinementsDir - Root directory for refinement outputs.
 * @returns Resolved paths for prompt, conversation, and usage artifacts.
 */
export function createArtifactPaths(runId: string, refinementsDir = DEFAULT_REFINEMENTS_DIR): IArtifactPaths {
  const baseDir = `${refinementsDir}/${runId}`;
  return {
    baseDir,
    conversation: `${baseDir}/conversation.txt`,
    prompt: `${baseDir}/prompt.txt`,
    usage: `${baseDir}/usage.json`,
  };
}

/**
 * Builds a complete refinement plan including shell commands and artifact paths.
 * @param workflowPath - Path to the workflow source file.
 * @param runId - The workflow run ID.
 * @returns A fully-populated {@link IRefinementPlan} for the given run.
 */
export function createRefinementPlan(workflowPath: string, runId: string): IRefinementPlan {
  return {
    artifactPaths: createArtifactPaths(runId),
    commands: {
      compile: compileWorkflowCommand(workflowPath),
      downloadArtifacts: downloadArtifactsCommand(runId, `${DEFAULT_REFINEMENTS_DIR}/${runId}`),
      run: runWorkflowCommand(workflowPath),
    },
    runId,
    workflowPath,
  };
}

/**
 * Builds a workflow factory dry-run plan from issue-like inputs.
 * @param request - Workflow request parsed from an issue or CLI input.
 * @returns Proposed workflow specification, artifacts, and validation errors.
 */
export function createWorkflowFactoryPlan(request: Readonly<IWorkflowRequest>): IWorkflowFactoryPlan {
  const spec = deriveWorkflowSpec(request);
  const artifacts = renderWorkflowArtifacts(spec);

  return {
    artifacts,
    request,
    spec,
    validationErrors: validateWorkflowFactoryArtifacts(spec, artifacts),
  };
}

/**
 * Creates a normalized workflow request from partial issue data.
 * @param input - Partial issue data from a GitHub issue, fixture, or CLI command.
 * @returns A normalized workflow factory request.
 */
export function createWorkflowRequest(input: Readonly<Partial<IWorkflowRequest>>): IWorkflowRequest {
  const body = normalizeWhitespace(input.body ?? DEFAULT_WORKFLOW_REQUEST_TEXT);
  const title = normalizeWhitespace(input.title ?? DEFAULT_WORKFLOW_REQUEST_TITLE);

  return {
    author: normalizeWhitespace(input.author ?? DEFAULT_WORKFLOW_REQUEST_AUTHOR),
    body,
    issueNumber: input.issueNumber ?? DEFAULT_WORKFLOW_REQUEST_ISSUE_NUMBER,
    labels: input.labels ?? [DEFAULT_WORKFLOW_LABEL],
    requestText: normalizeWhitespace(input.requestText ?? body),
    title,
  };
}

/**
 * Derives a workflow specification from a workflow request.
 * @param request - Workflow request parsed from an issue.
 * @returns A deterministic workflow specification.
 */
export function deriveWorkflowSpec(request: Readonly<IWorkflowRequest>): IWorkflowSpec {
  const category = inferWorkflowCategory(request.requestText);
  const name = slugWorkflowName(request.title);

  return {
    acceptanceCriteria: workflowAcceptanceCriteria(),
    category,
    description: `Workflow factory proposal for: ${request.requestText}`,
    inputs: workflowInputs(),
    mcpTools: workflowMcpTools(),
    name,
    outputs: workflowOutputs(),
    permissions: workflowPermissions(),
    safeOutputs: workflowSafeOutputs(),
    steps: workflowSteps(),
  };
}

/**
 * Infers the workflow factory category from request text.
 * @param requestText - Natural-language workflow request text.
 * @returns Inferred workflow category.
 */
function inferWorkflowCategory(requestText: string): WorkflowCategory {
  const normalized = requestText.toLowerCase();

  if (normalized.includes('analy')) {
    return WorkflowCategory.Analysis;
  }

  if (normalized.includes(WorkflowCategory.Evaluation) || normalized.includes('benchmark')) {
    return WorkflowCategory.Evaluation;
  }

  if (normalized.includes(WorkflowCategory.Refinement) || normalized.includes('improve')) {
    return WorkflowCategory.Refinement;
  }

  return WorkflowCategory.Generation;
}

/**
 * Validates whether an artifact is a workflow artifact.
 * @param artifact - Artifact to inspect.
 * @returns True when the artifact is a workflow proposal.
 */
function isWorkflowArtifact(artifact: Readonly<IGeneratedWorkflowArtifact>): boolean {
  return artifact.purpose === WorkflowFactoryArtifactPurpose.Workflow;
}

/**
 * Normalizes whitespace in user-provided text.
 * @param value - Text value to normalize.
 * @returns Trimmed text with repeated whitespace collapsed.
 */
function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Renders one markdown checklist item.
 * @param item - Checklist item text.
 * @returns Markdown checklist item.
 */
function renderChecklistItem(item: string): string {
  return `- [ ] ${item}`;
}

/**
 * Renders proposed artifacts for a workflow specification.
 * @param spec - Workflow specification to render.
 * @returns Proposed workflow artifacts.
 */
export function renderWorkflowArtifacts(spec: Readonly<IWorkflowSpec>): readonly IGeneratedWorkflowArtifact[] {
  return [
    {
      content: renderWorkflowMarkdown(spec),
      path: `workflows/${spec.name}.md`,
      purpose: WorkflowFactoryArtifactPurpose.Workflow,
    },
    {
      content: renderWorkflowReviewGuide(spec),
      path: `docs/generated/${spec.name}.md`,
      purpose: WorkflowFactoryArtifactPurpose.Docs,
    },
  ];
}

/**
 * Renders one workflow instruction step.
 * @param step - Step description.
 * @returns Workflow instruction text.
 */
function renderWorkflowInstructionStep(step: string): string {
  return `- ${step}`;
}

/**
 * Renders a GitHub Agentic Workflow markdown source proposal.
 * @param spec - Workflow specification to render.
 * @returns Workflow markdown content.
 */
function renderWorkflowMarkdown(spec: Readonly<IWorkflowSpec>): string {
  return `${renderWorkflowMarkdownFrontmatter(spec)}
${renderWorkflowMarkdownBody(spec)}`;
}

/**
 * Renders a GitHub Agentic Workflow markdown body.
 * @param spec - Workflow specification to render.
 * @returns Workflow markdown body.
 */
function renderWorkflowMarkdownBody(spec: Readonly<IWorkflowSpec>): string {
  return `
# ${spec.name}

${spec.description}

Category: ${spec.category}

## Inputs

${Object.entries(spec.inputs).map(renderWorkflowMarkdownField).join('\n')}

## Outputs

${Object.entries(spec.outputs).map(renderWorkflowMarkdownField).join('\n')}

## Instructions

${spec.steps.map(renderWorkflowInstructionStep).join('\n')}

Only use safe outputs for comments, labels, and proposed file changes. Do not merge or execute
generated artifacts without human review.
`;
}

/**
 * Renders one workflow markdown field.
 * @param entry - Field entry to render.
 * @returns Markdown field text.
 */
function renderWorkflowMarkdownField(entry: readonly [string, string]): string {
  const [key, value] = entry;
  return `- \`${key}\`: ${value}`;
}

/**
 * Renders GitHub Agentic Workflow frontmatter.
 * @param spec - Workflow specification to render.
 * @returns Workflow frontmatter.
 */
function renderWorkflowMarkdownFrontmatter(spec: Readonly<IWorkflowSpec>): string {
  return `---
on:
  workflow_dispatch:
permissions:
  contents: read
  issues: write
  pull-requests: write
safe-outputs:
  add-comment:
  create-pull-request:
    branch-prefix: agentics/${spec.name}
---`;
}

/**
 * Renders a markdown review guide for generated workflow artifacts.
 * @param spec - Workflow specification to document.
 * @returns Markdown review guide.
 */
function renderWorkflowReviewGuide(spec: Readonly<IWorkflowSpec>): string {
  return `# ${spec.name}

${spec.description}

## Review Checklist

${spec.acceptanceCriteria.map(renderChecklistItem).join('\n')}
`;
}

/**
 * Slugs a workflow name for filenames and workflow identifiers.
 * @param value - Source text to slug.
 * @returns Stable workflow slug.
 */
function slugWorkflowName(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/^workflow:\s*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_WORKFLOW_NAME_LENGTH)
    .replace(/-+$/g, '');

  if (slug.length > 0) {
    return slug;
  }

  return 'generated-workflow';
}

/**
 * Validates generated artifact proposals.
 * @param artifacts - Generated artifacts to validate.
 * @returns Validation errors.
 */
function validateGeneratedArtifacts(artifacts: readonly IGeneratedWorkflowArtifact[]): readonly string[] {
  const withArtifactError = appendCollectionError([], artifacts, 'At least one artifact is required.');
  const hasWorkflow = artifacts.some(isWorkflowArtifact);

  if (hasWorkflow) {
    return withArtifactError;
  }

  return [...withArtifactError, 'A workflow artifact is required.'];
}

/**
 * Validates workflow factory output before it is proposed for review.
 * @param spec - Workflow specification to validate.
 * @param artifacts - Rendered artifact proposals.
 * @returns Validation error messages.
 */
export function validateWorkflowFactoryArtifacts(
  spec: Readonly<IWorkflowSpec>,
  artifacts: readonly IGeneratedWorkflowArtifact[],
): readonly string[] {
  return [...validateWorkflowSpec(spec), ...validateGeneratedArtifacts(artifacts)];
}

/**
 * Validates a workflow specification.
 * @param spec - Workflow specification to validate.
 * @returns Validation errors.
 */
function validateWorkflowSpec(spec: Readonly<IWorkflowSpec>): readonly string[] {
  const withNameError = appendStringError([], spec.name, 'Workflow name is required.');
  const withDescriptionError = appendStringError(withNameError, spec.description, 'Workflow description is required.');
  const withInputsError = appendRecordError(withDescriptionError, spec.inputs, 'At least one input is required.');
  const withOutputsError = appendRecordError(withInputsError, spec.outputs, 'At least one output is required.');
  const withStepsError = appendCollectionError(withOutputsError, spec.steps, 'At least one step is required.');

  return appendCollectionError(withStepsError, spec.safeOutputs, 'At least one safe output is required.');
}

/**
 * Provides default workflow factory acceptance criteria.
 * @returns Workflow acceptance criteria.
 */
function workflowAcceptanceCriteria(): readonly string[] {
  return [
    'Generated workflow includes name, category, inputs, outputs, and steps.',
    'Generated artifacts are reviewable before execution.',
    'GitHub write operations are represented as safe outputs.',
  ];
}

/**
 * Provides default workflow factory inputs.
 * @returns Workflow input map.
 */
function workflowInputs(): Readonly<Record<string, string>> {
  return {
    request: 'string',
  };
}

/**
 * Provides default workflow factory MCP tool dependencies.
 * @returns Workflow MCP tools.
 */
function workflowMcpTools(): readonly string[] {
  return ['github:issues', 'agentics:workflow-factory'];
}

/**
 * Provides default workflow factory outputs.
 * @returns Workflow output map.
 */
function workflowOutputs(): Readonly<Record<string, string>> {
  return {
    workflow_yaml: 'string',
  };
}

/**
 * Provides default workflow factory permissions.
 * @returns Workflow permissions.
 */
function workflowPermissions(): Readonly<Record<string, string>> {
  return {
    contents: 'read',
    issues: 'write',
    'pull-requests': 'write',
  };
}

/**
 * Provides default workflow factory safe outputs.
 * @returns Workflow safe outputs.
 */
function workflowSafeOutputs(): readonly string[] {
  return ['issue-comment', 'label-transition', 'proposed-file-changes'];
}

/**
 * Provides default workflow factory steps.
 * @returns Workflow steps.
 */
function workflowSteps(): readonly string[] {
  return [
    'Read the workflow request issue.',
    'Derive a typed workflow specification.',
    'Render proposed workflow artifacts.',
    'Validate generated artifacts before review.',
  ];
}
