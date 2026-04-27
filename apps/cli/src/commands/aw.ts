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

import { executeAgenticWorkflowCommand } from '@agentics/github';
import { Command } from 'commander';
import type { ICommandRuntime } from '../runtime.js';

/**
 * Creates the Commander action for the GitHub Agentic Workflows proxy command.
 * @param runtime - Runtime adapter used for command output.
 * @returns A configured Commander action handler.
 */
function createAgenticWorkflowProxyAction(
  runtime: Readonly<ICommandRuntime>,
): (args: readonly string[]) => Promise<void> {
  /**
   * Executes the GitHub Agentic Workflows proxy command action.
   * @param args - Arguments to append after `gh aw`.
   */
  async function agenticWorkflowProxyAction(args: readonly string[]): Promise<void> {
    await handleAgenticWorkflowProxy(args, runtime);
  }

  return agenticWorkflowProxyAction;
}

/**
 * Executes and forwards a GitHub Agentic Workflows extension command.
 * @param args - Arguments to append after `gh aw`.
 * @param runtime - Runtime adapter used for command output.
 */
async function handleAgenticWorkflowProxy(args: readonly string[], runtime: Readonly<ICommandRuntime>): Promise<void> {
  const result = await executeAgenticWorkflowCommand(args);

  if (result.stdout.length > 0) {
    runtime.writeStdout(result.stdout);
  }

  if (result.stderr.length > 0) {
    runtime.writeStderr(result.stderr);
  }
}

/**
 * Registers the root `aw` proxy command on the given program.
 * @param program - The root Commander.js program instance.
 * @param runtime - Runtime adapter used for command output.
 */
export function registerAgenticWorkflowProxyCommand(
  program: Readonly<Command>,
  runtime: Readonly<ICommandRuntime>,
): void {
  program
    .command('aw')
    .description('Proxy GitHub CLI Agentic Workflows extension commands')
    .allowExcessArguments(true)
    .allowUnknownOption(true)
    .argument('[args...]', 'Arguments to append after `gh aw`')
    .action(createAgenticWorkflowProxyAction(runtime));
}
