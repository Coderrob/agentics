import { exec } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/** Default delay in milliseconds before retrying artifact download after fallback. */
const DEFAULT_RETRY_DELAY_MS = 5000;

/** Output captured from a shell command execution. */
export interface IExecResult {
  readonly stderr: string;
  readonly stdout: string;
}

/** Options for artifact download with a fallback workflow. */
export interface IDownloadWithFallbackOptions {
  readonly fallbackWorkflow?: string;
  readonly retryDelayMs?: number;
}

/**
 * Executes the GH AW compile step for the given workflow path.
 * @param path - Path to the workflow YAML file.
 * @returns Captured stdout and stderr from the compile command.
 */
export async function compileWorkflow(path: string): Promise<IExecResult> {
  const result = await execAsync(compileWorkflowCommand(path));
  return { stderr: result.stderr, stdout: result.stdout };
}

/**
 * Builds the shell command to compile a GH AW workflow file.
 * @param path - Path to the workflow YAML file.
 * @returns The shell command string.
 */
export function compileWorkflowCommand(path: string): string {
  return `gh aw compile --workflow ${path}`;
}

/**
 * Creates a promise that resolves after a specified delay in milliseconds.
 * @param ms - Duration to delay in milliseconds.
 * @returns A promise that resolves after the delay.
 */
function delay(ms: number): Promise<void> {
  /**
   * Promise executor that sets up the timeout resolution.
   * @param resolve - Resolve callback for the enclosing promise.
   */
  function executor(resolve: () => void): void {
    setTimeout(resolve, ms);
  }
  return new Promise<void>(executor);
}

/**
 * Downloads workflow run artifacts, creating the output directory if needed.
 * @param runId - The workflow run ID to download artifacts for.
 * @param outputDir - Local directory to write artifacts into.
 * @returns Captured stdout and stderr from the download command.
 */
export async function downloadArtifacts(runId: string, outputDir: string): Promise<IExecResult> {
  await mkdir(outputDir, { recursive: true });
  const result = await execAsync(downloadArtifactsCommand(runId, outputDir));
  return { stderr: result.stderr, stdout: result.stdout };
}

/**
 * Builds the shell command to download run artifacts to a local directory.
 * @param runId - The workflow run ID to download artifacts for.
 * @param outputDir - Local directory path for the downloaded artifacts.
 * @returns The shell command string.
 */
export function downloadArtifactsCommand(runId: string, outputDir: string): string {
  return `gh run download ${runId} -D ${outputDir}`;
}

/**
 * Downloads workflow run artifacts with an optional fallback workflow.
 * If the primary download fails and a fallback workflow is configured,
 * triggers the fallback workflow and retries the download after a brief delay.
 * @param runId - The workflow run ID to download artifacts for.
 * @param outputDir - Local directory path for the downloaded artifacts.
 * @param options - Optional fallback workflow name and retry delay.
 * @returns Captured stdout and stderr from the successful download.
 * @throws {Error} If no fallback is configured and the primary download fails.
 */
export async function downloadArtifactsWithFallback(
  runId: string,
  outputDir: string,
  options: Readonly<IDownloadWithFallbackOptions> = {}
): Promise<IExecResult> {
  const { fallbackWorkflow, retryDelayMs = DEFAULT_RETRY_DELAY_MS } = options;

  try {
    return await downloadArtifacts(runId, outputDir);
  } catch (primaryError) {
    if (!fallbackWorkflow) {
      throw primaryError;
    }

    await execAsync(`gh workflow run ${fallbackWorkflow} -f run_id=${runId}`);
    await delay(retryDelayMs);
    return downloadArtifacts(runId, outputDir);
  }
}

/**
 * Executes the GH AW run step for the given workflow path.
 * @param path - Path to the workflow YAML file.
 * @returns Captured stdout and stderr from the run command.
 */
export async function runWorkflow(path: string): Promise<IExecResult> {
  const result = await execAsync(runWorkflowCommand(path));
  return { stderr: result.stderr, stdout: result.stdout };
}

/**
 * Builds the shell command to execute a GH AW workflow file.
 * @param path - Path to the workflow YAML file.
 * @returns The shell command string.
 */
export function runWorkflowCommand(path: string): string {
  return `gh aw run --workflow ${path}`;
}
