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

import { createRefinementPlan } from '@agentics/agentics';
import { Command } from 'commander';
import type { ICommandRuntime } from '../../runtime.js';
import { writeJson } from '../../runtime.js';

/**
 * Creates the Commander action for the run command.
 * @param runtime - Runtime adapter used for writing command output.
 * @returns A configured Commander action handler.
 */
function createRunAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<{ runId: string; workflow: string }>) => void {
  /**
   * Executes the run command action.
   * @param options - Parsed command options containing the workflow path and run ID.
   */
  function runAction(options: Readonly<{ runId: string; workflow: string }>): void {
    handleRun(options, runtime);
  }

  return runAction;
}

/**
 * Runs the run action for the refine run command.
 * @param options - Parsed command options containing the workflow path and run ID.
 * @param runtime - Runtime adapter used for writing command output.
 */
function handleRun(options: Readonly<{ runId: string; workflow: string }>, runtime: Readonly<ICommandRuntime>): void {
  const plan = createRefinementPlan(options.workflow, options.runId);
  writeJson(runtime, plan);
}

/**
 * Registers the `refine run` subcommand on the given parent command.
 * @param parent - The Commander.js parent command to attach to.
 * @param runtime - Runtime adapter used for command output.
 */
export function registerRunCommand(parent: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  parent
    .command('run')
    .description('Create a refinement plan for a workflow run')
    .requiredOption('-w, --workflow <path>', 'Workflow YAML path')
    .requiredOption('-r, --run-id <id>', 'Workflow run ID')
    .action(createRunAction(runtime));
}
