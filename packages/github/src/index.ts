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
import { mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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
 * Arguments are passed directly to the process to prevent shell injection.
 * @param path - Path to the workflow source file.
 * @returns Captured stdout and stderr from the compile command.
 */
export async function compileWorkflow(path: string): Promise<IExecResult> {
  const result = await execFileAsync('gh', ['aw', 'compile', '--workflow', path]);
  return { stderr: result.stderr, stdout: result.stdout };
}

/**
 * Builds the shell command string to compile a GH AW workflow file (for display only).
 * This string is never passed to a shell executor; actual execution uses
 * {@link compileWorkflow} which calls execFile with individual arguments.
 * @param path - Path to the workflow source file.
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
 * Arguments are passed directly to the process to prevent shell injection.
 * @param runId - The workflow run ID to download artifacts for.
 * @param outputDir - Local directory to write artifacts into.
 * @returns Captured stdout and stderr from the download command.
 */
export async function downloadArtifacts(runId: string, outputDir: string): Promise<IExecResult> {
  await mkdir(outputDir, { recursive: true });
  const result = await execFileAsync('gh', ['run', 'download', runId, '-D', outputDir]);
  return { stderr: result.stderr, stdout: result.stdout };
}

/**
 * Builds the shell command string to download run artifacts (for display only).
 * This string is never passed to a shell executor; actual execution uses
 * {@link downloadArtifacts} which calls execFile with individual arguments.
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
 * Arguments are passed directly to the process to prevent shell injection.
 * @param runId - The workflow run ID to download artifacts for.
 * @param outputDir - Local directory path for the downloaded artifacts.
 * @param options - Optional fallback workflow name and retry delay.
 * @returns Captured stdout and stderr from the successful download.
 * @throws {Error} If no fallback is configured and the primary download fails.
 */
export async function downloadArtifactsWithFallback(
  runId: string,
  outputDir: string,
  options: Readonly<IDownloadWithFallbackOptions> = {},
): Promise<IExecResult> {
  const { fallbackWorkflow, retryDelayMs = DEFAULT_RETRY_DELAY_MS } = options;

  try {
    return await downloadArtifacts(runId, outputDir);
  } catch (primaryError) {
    if (!fallbackWorkflow) {
      throw primaryError;
    }

    await execFileAsync('gh', ['workflow', 'run', fallbackWorkflow, '-f', `run_id=${runId}`]);
    await delay(retryDelayMs);
    return downloadArtifacts(runId, outputDir);
  }
}

/**
 * Executes a GitHub CLI Agentic Workflows extension command.
 * Arguments are passed directly to the process to prevent shell injection.
 * @param args - Arguments to append after `gh aw`.
 * @returns Captured stdout and stderr from the proxied command.
 */
export async function executeAgenticWorkflowCommand(args: readonly string[]): Promise<IExecResult> {
  const result = await execFileAsync('gh', ['aw', ...args]);
  return { stderr: result.stderr, stdout: result.stdout };
}

/**
 * Executes the GH AW run step for the given workflow path.
 * Arguments are passed directly to the process to prevent shell injection.
 * @param path - Path to the workflow source file.
 * @returns Captured stdout and stderr from the run command.
 */
export async function runWorkflow(path: string): Promise<IExecResult> {
  const result = await execFileAsync('gh', ['aw', 'run', '--workflow', path]);
  return { stderr: result.stderr, stdout: result.stdout };
}

/**
 * Builds the shell command string to execute a GH AW workflow file (for display only).
 * This string is never passed to a shell executor; actual execution uses
 * {@link runWorkflow} which calls execFile with individual arguments.
 * @param path - Path to the workflow source file.
 * @returns The shell command string.
 */
export function runWorkflowCommand(path: string): string {
  return `gh aw run --workflow ${path}`;
}
