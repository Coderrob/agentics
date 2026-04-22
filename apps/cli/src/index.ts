import { Command } from 'commander';
import { attachRefineCommand } from './commands/refine/index.js';

/** Minimum argv length before explicit user arguments are present (node + script). */
const CLI_ARG_OFFSET = 2;

const program = new Command();

program
  .name('agentics')
  .description('Agentics workflow refinement CLI')
  .version('0.1.0');

attachRefineCommand(program);

if (process.argv.length > CLI_ARG_OFFSET) {
  await program.parseAsync(process.argv);
}

export { program };
