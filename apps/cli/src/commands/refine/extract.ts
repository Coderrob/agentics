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
