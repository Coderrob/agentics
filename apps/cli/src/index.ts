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

import { Command } from 'commander';
import { registerAgenticWorkflowProxyCommand } from './commands/aw.js';
import { attachRefineCommand } from './commands/refine/index.js';
import { registerWorkflowCommands } from './commands/workflows.js';
import type { ICommandRuntime } from './runtime.js';
import { createNodeCommandRuntime } from './runtime.js';

/** Minimum argv length before explicit user arguments are present (node + script). */
const CLI_ARG_OFFSET = 2;

const runtime = createNodeCommandRuntime();

/**
 * Configures Commander output to use the injected runtime boundary.
 * @param command - Commander program to configure.
 * @param commandRuntime - Runtime adapter used for output.
 */
function configureCommandOutput(command: Readonly<Command>, commandRuntime: Readonly<ICommandRuntime>): void {
  /**
   * Writes Commander error output through the runtime boundary.
   * @param output - Error text from Commander.
   */
  function writeCommandError(output: string): void {
    commandRuntime.writeStderr(output);
  }

  /**
   * Writes Commander standard output through the runtime boundary.
   * @param output - Output text from Commander.
   */
  function writeCommandOutput(output: string): void {
    commandRuntime.writeStdout(output);
  }

  command.configureOutput({
    writeErr: writeCommandError,
    writeOut: writeCommandOutput,
  });
}

/**
 * Creates the Agentics CLI program with runtime-backed output.
 * @param commandRuntime - Runtime adapter used for CLI output.
 * @returns A configured Commander program.
 */
export function createCliProgram(commandRuntime: Readonly<ICommandRuntime>): Command {
  const command = new Command();

  command.name('agentics').description('Agentics workflow refinement CLI').version('0.1.0');
  configureCommandOutput(command, commandRuntime);
  registerAgenticWorkflowProxyCommand(command, commandRuntime);
  attachRefineCommand(command, commandRuntime);
  registerWorkflowCommands(command, commandRuntime);

  return command;
}

const program = createCliProgram(runtime);

/* v8 ignore next 3 -- entry-point guard: cannot be exercised in unit tests */
if (runtime.argv.length > CLI_ARG_OFFSET) {
  await program.parseAsync([...runtime.argv]);
}

export { program };
