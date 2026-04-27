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

import { analyzeConversation } from '@agentics/agentics';
import { Command } from 'commander';
import type { ICommandRuntime } from '../../runtime.js';
import { writeJson } from '../../runtime.js';

/**
 * Creates the Commander action for the analyze command.
 * @param runtime - Runtime adapter used for writing command output.
 * @returns A configured Commander action handler.
 */
function createAnalyzeAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<{ conversation: string }>) => void {
  /**
   * Executes the analyze command action.
   * @param options - Parsed command options containing the conversation text.
   */
  function analyzeAction(options: Readonly<{ conversation: string }>): void {
    handleAnalyze(options, runtime);
  }

  return analyzeAction;
}

/**
 * Runs the analyze action for the refine analyze command.
 * @param options - Parsed command options containing the conversation text.
 * @param runtime - Runtime adapter used for writing command output.
 */
function handleAnalyze(options: Readonly<{ conversation: string }>, runtime: Readonly<ICommandRuntime>): void {
  const result = analyzeConversation(options.conversation);
  writeJson(runtime, result);
}

/**
 * Registers the `refine analyze` subcommand on the given parent command.
 * @param parent - The Commander.js parent command to attach to.
 * @param runtime - Runtime adapter used for command output.
 */
export function registerAnalyzeCommand(parent: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  parent
    .command('analyze')
    .description('Analyze a conversation transcript for optimization opportunities')
    .requiredOption('-c, --conversation <text>', 'Conversation content to analyze')
    .action(createAnalyzeAction(runtime));
}
