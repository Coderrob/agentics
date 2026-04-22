import { Command } from 'commander';
import { registerAnalyzeCommand } from './analyze.js';
import { registerExtractCommand } from './extract.js';
import { registerRunCommand } from './run.js';

/** Attaches the `refine` command and all its subcommands to the root program. */
export function attachRefineCommand(program: Readonly<Command>): void {
  const refine = new Command('refine').description('Workflow refinement commands');
  registerAnalyzeCommand(refine);
  registerExtractCommand(refine);
  registerRunCommand(refine);
  program.addCommand(refine);
}
