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

import { type Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { executeAgenticWorkflowCommand } from '@agentics/github';
import { Command } from 'commander';
import type { ICommandRuntime } from '../runtime.js';

/** Default directory containing source workflow markdown files. */
const DEFAULT_WORKFLOWS_DIRECTORY = 'workflows';

/** Options for the workflow compile command. */
interface IWorkflowCompileOptions {
  readonly directory?: string;
}

/**
 * Creates a reducer that compiles markdown workflows sequentially.
 * @param runtime - Runtime adapter used for command output.
 * @returns A markdown workflow compile reducer.
 */
function compileNextWorkflow(
  runtime: Readonly<ICommandRuntime>,
): (previous: Readonly<Promise<void>>, workflowPath: string) => Promise<void> {
  /**
   * Runs the next compile step after the previous one completes.
   * @param previous - Previous compile promise.
   * @param workflowPath - Markdown workflow path to compile.
   */
  async function compileNext(previous: Readonly<Promise<void>>, workflowPath: string): Promise<void> {
    await previous;
    await executeWorkflowCompile(workflowPath, runtime);
  }

  return compileNext;
}

/**
 * Compiles every markdown workflow under the configured workflow directory.
 * @param options - Compile command options.
 * @param runtime - Runtime adapter used for command output.
 */
async function compileWorkflowMarkdownFiles(
  options: Readonly<IWorkflowCompileOptions>,
  runtime: Readonly<ICommandRuntime>,
): Promise<void> {
  const directory = options.directory ?? DEFAULT_WORKFLOWS_DIRECTORY;
  const paths = await findMarkdownFiles(directory);
  await paths.reduce<Promise<void>>(compileNextWorkflow(runtime), Promise.resolve());
}

/**
 * Creates the Commander action for compiling workflow markdown files.
 * @param runtime - Runtime adapter used for command output.
 * @returns A configured Commander action handler.
 */
function createCompileWorkflowsAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<IWorkflowCompileOptions>) => Promise<void> {
  /**
   * Executes the workflow markdown compile command action.
   * @param options - Compile command options.
   */
  async function compileWorkflowsAction(options: Readonly<IWorkflowCompileOptions>): Promise<void> {
    await compileWorkflowMarkdownFiles(options, runtime);
  }

  return compileWorkflowsAction;
}

/**
 * Executes the GitHub Agentic Workflows compiler for one markdown file.
 * @param workflowPath - Markdown workflow path to compile.
 * @param runtime - Runtime adapter used for command output.
 */
async function executeWorkflowCompile(workflowPath: string, runtime: Readonly<ICommandRuntime>): Promise<void> {
  const result = await executeAgenticWorkflowCommand(['compile', '--workflow', workflowPath]);

  if (result.stdout.length > 0) {
    runtime.writeStdout(result.stdout);
  }

  if (result.stderr.length > 0) {
    runtime.writeStderr(result.stderr);
  }
}

/**
 * Finds markdown workflow files under a directory.
 * @param directory - Directory to scan recursively.
 * @returns Sorted markdown file paths.
 */
async function findMarkdownFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  /**
   * Finds markdown paths for one directory entry.
   * @param entry - Directory entry to inspect.
   * @returns Markdown file paths found for the entry.
   */
  async function findMarkdownPathsForEntry(entry: Readonly<Dirent>): Promise<readonly string[]> {
    const childPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return findMarkdownFiles(childPath);
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      return [childPath];
    }

    return [];
  }

  const nestedPaths = await Promise.all(entries.map(findMarkdownPathsForEntry));

  return nestedPaths.flat().reduce<readonly string[]>(insertSortedPath, []);
}

/**
 * Inserts a path into a sorted immutable path list.
 * @param paths - Existing sorted paths.
 * @param path - Path to insert.
 * @returns A new sorted path list.
 */
function insertSortedPath(paths: readonly string[], path: string): readonly string[] {
  /**
   * Checks whether an existing path should sort after the inserted path.
   * @param existingPath - Existing path to compare.
   * @returns True when the existing path sorts after the inserted path.
   */
  function isAfterPath(existingPath: string): boolean {
    return existingPath.localeCompare(path) > 0;
  }

  /**
   * Checks whether an existing path should sort before or at the inserted path.
   * @param existingPath - Existing path to compare.
   * @returns True when the existing path sorts before or at the inserted path.
   */
  function isBeforeOrSamePath(existingPath: string): boolean {
    return existingPath.localeCompare(path) <= 0;
  }

  const beforePath = paths.filter(isBeforeOrSamePath);
  const afterPath = paths.filter(isAfterPath);

  return [...beforePath, path, ...afterPath];
}

/**
 * Registers workflow utility commands on the given program.
 * @param program - The root Commander.js program instance.
 * @param runtime - Runtime adapter used for command output.
 */
export function registerWorkflowCommands(program: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  const workflows = program.command('workflows').description('Workflow source file commands');

  workflows
    .command('compile')
    .description('Compile markdown workflows through the GitHub Agentic Workflows extension')
    .option('-d, --directory <path>', 'Directory containing markdown workflow files', DEFAULT_WORKFLOWS_DIRECTORY)
    .action(createCompileWorkflowsAction(runtime));
}
