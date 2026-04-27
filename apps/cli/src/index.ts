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

import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Command } from 'commander';
import { registerAgenticWorkflowProxyCommand } from './commands/aw.js';
import { attachRefineCommand } from './commands/refine/index.js';
import { registerWorkflowCommands } from './commands/workflows.js';
import type { ICommandRuntime } from './runtime.js';
import { createNodeCommandRuntime } from './runtime.js';

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

/**
 * Checks whether the current module is the invoked CLI entrypoint.
 * @param moduleUrl - URL for the current ES module.
 * @param argv - Runtime command-line arguments.
 * @returns True when the current module path matches the invoked script path.
 */
function isDirectExecution(moduleUrl: string, argv: readonly string[]): boolean {
  const scriptPath = argv[1];

  if (!scriptPath) {
    return false;
  }

  return fileURLToPath(moduleUrl) === fileURLToPath(pathToFileURL(resolve(scriptPath)));
}

/* v8 ignore next 3 -- entry-point guard: cannot be exercised in unit tests */
if (isDirectExecution(import.meta.url, runtime.argv)) {
  await program.parseAsync([...runtime.argv]);
}

export { program };
