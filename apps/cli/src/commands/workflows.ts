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
import { createWorkflowFactoryPlan, createWorkflowRequest } from '@agentics/agentics';
import { executeAgenticWorkflowCommand } from '@agentics/github';
import { Command } from 'commander';
import type { ICommandRuntime } from '../runtime.js';
import { writeJson } from '../runtime.js';

/** Default directory containing GitHub Agentic Workflow markdown source files. */
const DEFAULT_WORKFLOWS_DIRECTORY = 'workflows';

/** Base-10 radix for parsing issue numbers. */
const DECIMAL_RADIX = 10;

/** Options for the workflow compile command. */
interface IWorkflowCompileOptions {
  readonly directory?: string;
}

/** Options for the workflow factory dry-run command. */
interface IWorkflowFactoryOptions {
  readonly author?: string;
  readonly body: string;
  readonly issueNumber?: number;
  readonly label?: readonly string[];
  readonly title?: string;
}

/**
 * Creates a reducer that compiles workflows sequentially.
 * @param runtime - Runtime adapter used for command output.
 * @returns A workflow compile reducer.
 */
function compileNextWorkflow(
  runtime: Readonly<ICommandRuntime>,
): (previous: Readonly<Promise<void>>, workflowPath: string) => Promise<void> {
  /**
   * Runs the next compile step after the previous one completes.
   * @param previous - Previous compile promise.
   * @param workflowPath - Workflow path to compile.
   */
  async function compileNext(previous: Readonly<Promise<void>>, workflowPath: string): Promise<void> {
    await previous;
    await executeWorkflowCompile(workflowPath, runtime);
  }

  return compileNext;
}

/**
 * Compiles every workflow source file under the configured workflow directory.
 * @param options - Compile command options.
 * @param runtime - Runtime adapter used for command output.
 */
async function compileWorkflowSourceFiles(
  options: Readonly<IWorkflowCompileOptions>,
  runtime: Readonly<ICommandRuntime>,
): Promise<void> {
  const directory = options.directory ?? DEFAULT_WORKFLOWS_DIRECTORY;
  const paths = await findWorkflowSourceFiles(directory);
  await paths.reduce<Promise<void>>(compileNextWorkflow(runtime), Promise.resolve());
}

/**
 * Creates the Commander action for compiling workflow source files.
 * @param runtime - Runtime adapter used for command output.
 * @returns A configured Commander action handler.
 */
function createCompileWorkflowsAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<IWorkflowCompileOptions>) => Promise<void> {
  /**
   * Executes the workflow source compile command action.
   * @param options - Compile command options.
   */
  async function compileWorkflowsAction(options: Readonly<IWorkflowCompileOptions>): Promise<void> {
    await compileWorkflowSourceFiles(options, runtime);
  }

  return compileWorkflowsAction;
}

/**
 * Creates the Commander action for the workflow factory dry-run command.
 * @param runtime - Runtime adapter used for command output.
 * @returns A configured Commander action handler.
 */
function createWorkflowFactoryAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<IWorkflowFactoryOptions>) => void {
  /**
   * Executes the workflow factory dry-run command action.
   * @param options - Workflow factory command options.
   */
  function workflowFactoryAction(options: Readonly<IWorkflowFactoryOptions>): void {
    handleWorkflowFactory(options, runtime);
  }

  return workflowFactoryAction;
}

/**
 * Executes the GitHub Agentic Workflows compiler for one markdown source file.
 * @param workflowPath - Markdown workflow source path to compile.
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
 * Finds workflow source files under a directory.
 * @param directory - Directory to scan recursively.
 * @returns Sorted workflow source file paths.
 */
async function findWorkflowSourceFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  /**
   * Finds workflow source paths for one directory entry.
   * @param entry - Directory entry to inspect.
   * @returns Workflow source file paths found for the entry.
   */
  async function findWorkflowSourcePathsForEntry(entry: Readonly<Dirent>): Promise<readonly string[]> {
    const childPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return findWorkflowSourceFiles(childPath);
    }

    if (entry.isFile() && isWorkflowSourceFile(entry.name)) {
      return [childPath];
    }

    return [];
  }

  const nestedPaths = await Promise.all(entries.map(findWorkflowSourcePathsForEntry));

  return nestedPaths.flat().reduce<readonly string[]>(insertSortedPath, []);
}

/**
 * Runs the workflow factory dry-run command.
 * @param options - Workflow factory command options.
 * @param runtime - Runtime adapter used for command output.
 */
function handleWorkflowFactory(options: Readonly<IWorkflowFactoryOptions>, runtime: Readonly<ICommandRuntime>): void {
  const request = createWorkflowRequest({
    author: options.author,
    body: options.body,
    issueNumber: options.issueNumber,
    labels: options.label,
    title: options.title,
  });

  writeJson(runtime, createWorkflowFactoryPlan(request));
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
 * Checks whether a file name is a source workflow file.
 * @param fileName - File name to inspect.
 * @returns True when the file is a Markdown GitHub Agentic Workflow source file.
 */
function isWorkflowSourceFile(fileName: string): boolean {
  return fileName.endsWith('.md');
}

/**
 * Parses a CLI issue number option.
 * @param value - Issue number string.
 * @returns Parsed issue number.
 */
function parseIssueNumber(value: string): number {
  return Number.parseInt(value, DECIMAL_RADIX);
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
    .description('Compile Markdown workflows through the GitHub Agentic Workflows extension')
    .option('-d, --directory <path>', 'Directory containing Markdown workflow files', DEFAULT_WORKFLOWS_DIRECTORY)
    .action(createCompileWorkflowsAction(runtime));

  workflows
    .command('factory')
    .description('Dry-run a LabelOps workflow factory request')
    .requiredOption('-b, --body <text>', 'Natural-language workflow request body')
    .option('-a, --author <login>', 'Issue author login')
    .option('-i, --issue-number <number>', 'Issue number', parseIssueNumber)
    .option('-l, --label <label...>', 'Issue labels')
    .option('-t, --title <title>', 'Issue title')
    .action(createWorkflowFactoryAction(runtime));
}
