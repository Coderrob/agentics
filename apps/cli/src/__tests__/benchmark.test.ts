// Copyright 2026 Robert Lindley
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

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { beforeEach, describe, expect, it } from 'vitest';
import { registerBenchmarkCommand } from '../commands/refine/benchmark.js';
import { createCommandRuntime } from '../runtime.js';

describe('benchmark command', () => {
  let capturedOutput: string;

  beforeEach(() => {
    capturedOutput = '';
  });

  it('should produce a benchmark report from two usage files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentics-bench-'));

    try {
      const baselinePath = join(dir, 'baseline.json');
      const candidatePath = join(dir, 'candidate.json');

      await writeFile(
        baselinePath,
        JSON.stringify({ completionTokens: 100, executionMs: 2000, promptTokens: 200, toolCalls: 10 }),
      );
      await writeFile(
        candidatePath,
        JSON.stringify({ completionTokens: 80, executionMs: 1500, promptTokens: 150, toolCalls: 7 }),
      );

      const root = new Command();
      const runtime = createCommandRuntime([], (output: string) => {
        capturedOutput += output;
      });
      registerBenchmarkCommand(root, runtime);
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
      const runtime = createCommandRuntime([], (output: string) => {
        capturedOutput += output;
      });
      root.exitOverride();
      registerBenchmarkCommand(root, runtime);

      await expect(root.parseAsync(['node', 'test', 'benchmark', '-b', badPath, '-c', badPath])).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
