export function compileWorkflowCommand(path: string): string {
  return `gh aw compile --workflow ${path}`;
}

export function runWorkflowCommand(path: string): string {
  return `gh aw run --workflow ${path}`;
}

export function downloadArtifactsCommand(runId: string, outputDir: string): string {
  return `gh run download ${runId} -D ${outputDir}`;
}
