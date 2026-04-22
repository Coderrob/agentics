import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAnalyzeCommand } from '../commands/refine/analyze.js';
import { registerExtractCommand } from '../commands/refine/extract.js';
import { registerRunCommand } from '../commands/refine/run.js';

describe('refine command handlers', () => {
  let capturedOutput: string;
  let writeSpy: { mockRestore: () => void };

  beforeEach(() => {
    capturedOutput = '';
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementationOnce((chunk: unknown) => {
      capturedOutput += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('should output analyze results as JSON', async () => {
    const root = new Command();
    registerAnalyzeCommand(root);
    await root.parseAsync(['node', 'test', 'analyze', '-c', 'Reasoning about the problem.']);
    const result = JSON.parse(capturedOutput);
    expect(result).toHaveProperty('recommendations');
    expect(result.redundantReasoningMentions).toBeGreaterThan(0);
  });

  it('should output extract artifact paths as JSON', async () => {
    const root = new Command();
    registerExtractCommand(root);
    await root.parseAsync(['node', 'test', 'extract', '-r', 'run-42', '-d', 'custom-dir']);
    const result = JSON.parse(capturedOutput);
    expect(result.baseDir).toBe('custom-dir/run-42');
    expect(result.usage).toBe('custom-dir/run-42/usage.json');
  });

  it('should output run refinement plan as JSON', async () => {
    const root = new Command();
    registerRunCommand(root);
    await root.parseAsync(['node', 'test', 'run', '-w', '.github/workflows/ci.yml', '-r', 'run-99']);
    const result = JSON.parse(capturedOutput);
    expect(result.workflowPath).toBe('.github/workflows/ci.yml');
    expect(result.runId).toBe('run-99');
    expect(result.commands.compile).toContain('gh aw compile');
  });
});
