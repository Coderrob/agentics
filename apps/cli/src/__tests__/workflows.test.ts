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

import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWorkflowCommands } from '../commands/workflows.js';
import { createCommandRuntime } from '../runtime.js';

const executeAgenticWorkflowCommandMock = vi.hoisted(() => vi.fn());

vi.mock('@agentics/github', () => ({
  executeAgenticWorkflowCommand: executeAgenticWorkflowCommandMock,
}));

describe('workflow commands', () => {
  let capturedError: string;
  let capturedOutput: string;

  beforeEach(() => {
    capturedError = '';
    capturedOutput = '';
    executeAgenticWorkflowCommandMock.mockReset();
  });

  it('should compile markdown files in workflow directories', async () => {
    executeAgenticWorkflowCommandMock
      .mockResolvedValueOnce({ stderr: '', stdout: 'compiled\n' })
      .mockResolvedValueOnce({ stderr: '', stdout: 'compiled\n' });
    const directory = await mkdtemp(join(tmpdir(), 'agentics-workflows-'));
    const nestedDirectory = join(directory, 'nested');
    await mkdir(nestedDirectory);
    await writeFile(join(directory, 'workflow-a.md'), '# Workflow A\n');
    await writeFile(join(directory, 'workflow-a.lock.yml'), 'name: ignored\n');
    await writeFile(join(nestedDirectory, 'workflow-b.md'), '# Workflow B\n');
    const root = new Command();
    const runtime = createCommandRuntime(
      [],
      (output: string) => {
        capturedOutput += output;
      },
      (output: string) => {
        capturedError += output;
      },
    );

    registerWorkflowCommands(root, runtime);
    await root.parseAsync(['node', 'test', 'workflows', 'compile', '--directory', directory]);

    expect(executeAgenticWorkflowCommandMock).toHaveBeenNthCalledWith(1, [
      'compile',
      '--workflow',
      join(nestedDirectory, 'workflow-b.md'),
    ]);
    expect(executeAgenticWorkflowCommandMock).toHaveBeenNthCalledWith(2, [
      'compile',
      '--workflow',
      join(directory, 'workflow-a.md'),
    ]);
    expect(capturedOutput).toBe('compiled\ncompiled\n');
    expect(capturedError).toBe('');
  });

  it('should forward compile stderr from the workflow compiler', async () => {
    executeAgenticWorkflowCommandMock.mockResolvedValueOnce({ stderr: 'warning\n', stdout: '' });
    const directory = await mkdtemp(join(tmpdir(), 'agentics-workflows-warning-'));
    await writeFile(join(directory, 'workflow.md'), '# Workflow\n');
    const root = new Command();
    const runtime = createCommandRuntime(
      [],
      (output: string) => {
        capturedOutput += output;
      },
      (output: string) => {
        capturedError += output;
      },
    );

    registerWorkflowCommands(root, runtime);
    await root.parseAsync(['node', 'test', 'workflows', 'compile', '--directory', directory]);

    expect(capturedOutput).toBe('');
    expect(capturedError).toBe('warning\n');
  });
});
