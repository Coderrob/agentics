import { exec } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export function compileWorkflowCommand(path: string): string {
  return `gh aw compile --workflow ${path}`;
}

export function runWorkflowCommand(path: string): string {
  return `gh aw run --workflow ${path}`;
}

export function downloadArtifactsCommand(runId: string, outputDir: string): string {
  return `gh run download ${runId} -D ${outputDir}`;
}

export async function compileWorkflow(path: string): Promise<ExecResult> {
  const result = await execAsync(compileWorkflowCommand(path));
  return { stdout: result.stdout, stderr: result.stderr };
}

export async function runWorkflow(path: string): Promise<ExecResult> {
  const result = await execAsync(runWorkflowCommand(path));
  return { stdout: result.stdout, stderr: result.stderr };
}

export async function downloadArtifacts(runId: string, outputDir: string): Promise<ExecResult> {
  await mkdir(outputDir, { recursive: true });
  const result = await execAsync(downloadArtifactsCommand(runId, outputDir));
  return { stdout: result.stdout, stderr: result.stderr };
}

export interface DownloadWithFallbackOptions {
  fallbackWorkflow?: string;
  retryDelayMs?: number;
}

export async function downloadArtifactsWithFallback(
  runId: string,
  outputDir: string,
  options: DownloadWithFallbackOptions = {}
): Promise<ExecResult> {
  const { fallbackWorkflow, retryDelayMs = 5000 } = options;

  try {
    return await downloadArtifacts(runId, outputDir);
  } catch (primaryError) {
    if (!fallbackWorkflow) {
      throw primaryError;
    }

    await execAsync(`gh workflow run ${fallbackWorkflow} -f run_id=${runId}`);
    await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
    return downloadArtifacts(runId, outputDir);
  }
}
