import { Command } from 'commander';
import { createArtifactPaths } from '@agentics/agentics';

export function registerExtractCommand(parent: Command): void {
  parent
    .command('extract')
    .description('Show expected artifact file paths for a run')
    .requiredOption('-r, --run-id <id>', 'Workflow run ID')
    .option('-d, --dir <path>', 'Refinements directory', 'refinements')
    .action((options: { runId: string; dir: string }) => {
      const paths = createArtifactPaths(options.runId, options.dir);
      process.stdout.write(`${JSON.stringify(paths, null, 2)}\n`);
    });
}
