// Copyright 2024 Robert Lindley
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
import { attachRefineCommand } from './commands/refine/index.js';

/** Minimum argv length before explicit user arguments are present (node + script). */
const CLI_ARG_OFFSET = 2;

const program = new Command();

program.name('agentics').description('Agentics workflow refinement CLI').version('0.1.0');

attachRefineCommand(program);

/* v8 ignore next 3 -- entry-point guard: cannot be exercised in unit tests */
if (process.argv.length > CLI_ARG_OFFSET) {
  await program.parseAsync(process.argv);
}

export { program };
