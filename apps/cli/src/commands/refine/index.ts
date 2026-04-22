import { Command } from 'commander';
import { registerAnalyzeCommand } from './analyze.js';
import { registerExtractCommand } from './extract.js';
import { registerRunCommand } from './run.js';

export function attachRefineCommand(program: Command): void {
  const refine = new Command('refine').description('Workflow refinement commands');
  registerRunCommand(refine);
  registerAnalyzeCommand(refine);
  registerExtractCommand(refine);
  program.addCommand(refine);
}
