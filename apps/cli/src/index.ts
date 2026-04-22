import { Command } from 'commander';
import { attachRefineCommand } from './commands/refine/index.js';

const program = new Command();

program
  .name('agentics')
  .description('Agentics workflow refinement CLI')
  .version('0.1.0');

attachRefineCommand(program);

if (process.argv.length > 2) {
  await program.parseAsync(process.argv);
}

export { program };
