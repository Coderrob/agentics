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

import { createArtifactPaths } from '@agentics/agentics';
import { Command } from 'commander';
import type { ICommandRuntime } from '../../runtime.js';
import { writeJson } from '../../runtime.js';

/**
 * Creates the Commander action for the extract command.
 * @param runtime - Runtime adapter used for writing command output.
 * @returns A configured Commander action handler.
 */
function createExtractAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<{ dir: string; runId: string }>) => void {
  /**
   * Executes the extract command action.
   * @param options - Parsed command options containing the run ID and directory.
   */
  function extractAction(options: Readonly<{ dir: string; runId: string }>): void {
    handleExtract(options, runtime);
  }

  return extractAction;
}

/**
 * Runs the extract action for the refine extract command.
 * @param options - Parsed command options containing the run ID and directory.
 * @param runtime - Runtime adapter used for writing command output.
 */
function handleExtract(options: Readonly<{ dir: string; runId: string }>, runtime: Readonly<ICommandRuntime>): void {
  const paths = createArtifactPaths(options.runId, options.dir);
  writeJson(runtime, paths);
}

/**
 * Registers the `refine extract` subcommand on the given parent command.
 * @param parent - The Commander.js parent command to attach to.
 * @param runtime - Runtime adapter used for command output.
 */
export function registerExtractCommand(parent: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  parent
    .command('extract')
    .description('Show expected artifact file paths for a run')
    .requiredOption('-r, --run-id <id>', 'Workflow run ID')
    .option('-d, --dir <path>', 'Refinements directory', 'refinements')
    .action(createExtractAction(runtime));
}
