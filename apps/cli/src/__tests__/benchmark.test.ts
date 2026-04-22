import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerBenchmarkCommand } from '../commands/refine/benchmark.js';

describe('benchmark command', () => {
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

  it('should produce a benchmark report from two usage files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentics-bench-'));

    try {
      const baselinePath = join(dir, 'baseline.json');
      const candidatePath = join(dir, 'candidate.json');

      await writeFile(baselinePath, JSON.stringify({ completionTokens: 100, executionMs: 2000, promptTokens: 200, toolCalls: 10 }));
      await writeFile(candidatePath, JSON.stringify({ completionTokens: 80, executionMs: 1500, promptTokens: 150, toolCalls: 7 }));

      const root = new Command();
      registerBenchmarkCommand(root);
      await root.parseAsync(['node', 'test', 'benchmark', '-b', baselinePath, '-c', candidatePath]);

      const report = JSON.parse(capturedOutput);
      expect(report).toHaveProperty('baseline');
      expect(report).toHaveProperty('candidate');
      expect(report).toHaveProperty('improvements');
      expect(report.tokenDelta).toBeGreaterThan(0);
      expect(report.toolCallDelta).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('should throw when given an invalid usage file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentics-bench-invalid-'));

    try {
      const badPath = join(dir, 'bad.json');
      await writeFile(badPath, JSON.stringify({ notMetrics: true }));

      const root = new Command();
      root.exitOverride();
      registerBenchmarkCommand(root);

      await expect(
        root.parseAsync(['node', 'test', 'benchmark', '-b', badPath, '-c', badPath])
      ).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
