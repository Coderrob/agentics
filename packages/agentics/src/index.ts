import { createProvider, type ConversationAnalysis } from '@agentics/ai';
import {
  compileWorkflowCommand,
  downloadArtifactsCommand,
  runWorkflowCommand
} from '@agentics/github';

export interface RefinementPlan {
  workflowPath: string;
  runId: string;
  commands: {
    compile: string;
    run: string;
    downloadArtifacts: string;
  };
  artifactPaths: {
    baseDir: string;
    prompt: string;
    conversation: string;
    usage: string;
  };
}

export function createArtifactPaths(runId: string, refinementsDir = 'refinements'): RefinementPlan['artifactPaths'] {
  const baseDir = `${refinementsDir}/${runId}`;
  return {
    baseDir,
    prompt: `${baseDir}/prompt.txt`,
    conversation: `${baseDir}/conversation.txt`,
    usage: `${baseDir}/usage.json`
  };
}

export function createRefinementPlan(workflowPath: string, runId: string): RefinementPlan {
  return {
    workflowPath,
    runId,
    commands: {
      compile: compileWorkflowCommand(workflowPath),
      run: runWorkflowCommand(workflowPath),
      downloadArtifacts: downloadArtifactsCommand(runId, `refinements/${runId}`)
    },
    artifactPaths: createArtifactPaths(runId)
  };
}

export function analyzeConversation(content: string): ConversationAnalysis {
  const provider = createProvider('ollama');
  return provider.analyzeConversation(content);
}
