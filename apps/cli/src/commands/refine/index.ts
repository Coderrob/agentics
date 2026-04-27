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
import { registerAnalyzeCommand } from './analyze.js';
import { registerBenchmarkCommand } from './benchmark.js';
import { registerExtractCommand } from './extract.js';
import { registerRunCommand } from './run.js';
import type { ICommandRuntime } from './runtime.js';

/**
 * Attaches the `refine` command and all its subcommands to the root program.
 * @param program - The root Commander.js program instance.
 * @param runtime - Runtime adapter used for command output.
 */
export function attachRefineCommand(program: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  const refine = new Command('refine').description('Workflow refinement commands');
  registerAnalyzeCommand(refine, runtime);
  registerBenchmarkCommand(refine, runtime);
  registerExtractCommand(refine, runtime);
  registerRunCommand(refine, runtime);
  program.addCommand(refine);
}
