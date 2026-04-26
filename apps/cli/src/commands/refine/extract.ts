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

import { createArtifactPaths } from '@agentics/agentics';
import { Command } from 'commander';

/** JSON indentation level for command output. */
const JSON_INDENT = 2;

/**
 * Runs the extract action for the refine extract command.
 * @param options - Parsed command options containing the run ID and directory.
 */
function handleExtract(options: Readonly<{ dir: string; runId: string }>): void {
  const paths = createArtifactPaths(options.runId, options.dir);
  process.stdout.write(`${JSON.stringify(paths, null, JSON_INDENT)}\n`);
}

/**
 * Registers the `refine extract` subcommand on the given parent command.
 * @param parent - The Commander.js parent command to attach to.
 */
export function registerExtractCommand(parent: Readonly<Command>): void {
  parent
    .command('extract')
    .description('Show expected artifact file paths for a run')
    .requiredOption('-r, --run-id <id>', 'Workflow run ID')
    .option('-d, --dir <path>', 'Refinements directory', 'refinements')
    .action(handleExtract);
}
