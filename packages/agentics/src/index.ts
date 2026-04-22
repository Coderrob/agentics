import type { IConversationAnalysis } from '@agentics/ai';
import { createProvider } from '@agentics/ai';
import { compileWorkflowCommand, downloadArtifactsCommand, runWorkflowCommand } from '@agentics/github';

/** Default directory for storing workflow run refinement artifacts. */
const DEFAULT_REFINEMENTS_DIR = 'refinements';

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
 * @param workflowPath - Path to the workflow YAML file.
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
