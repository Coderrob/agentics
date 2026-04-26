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
