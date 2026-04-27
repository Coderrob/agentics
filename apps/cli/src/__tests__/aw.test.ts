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

import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAgenticWorkflowProxyCommand } from '../commands/aw.js';
import { createCommandRuntime } from '../runtime.js';

const executeAgenticWorkflowCommandMock = vi.hoisted(() => vi.fn());

vi.mock('@agentics/github', () => ({
  executeAgenticWorkflowCommand: executeAgenticWorkflowCommandMock,
}));

describe('agentic workflow proxy command', () => {
  let capturedError: string;
  let capturedOutput: string;

  beforeEach(() => {
    capturedError = '';
    capturedOutput = '';
    executeAgenticWorkflowCommandMock.mockReset();
  });

  it('should proxy arguments to the GitHub Agentic Workflows extension', async () => {
    executeAgenticWorkflowCommandMock.mockResolvedValueOnce({ stderr: '', stdout: 'workflow output' });
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

    registerAgenticWorkflowProxyCommand(root, runtime);
    await root.parseAsync(['node', 'test', 'aw', 'compile', '--workflow', 'workflow.yaml']);

    expect(executeAgenticWorkflowCommandMock).toHaveBeenNthCalledWith(1, ['compile', '--workflow', 'workflow.yaml']);
    expect(capturedOutput).toBe('workflow output');
    expect(capturedError).toBe('');
  });

  it('should forward stderr from the GitHub Agentic Workflows extension', async () => {
    executeAgenticWorkflowCommandMock.mockResolvedValueOnce({ stderr: 'workflow warning', stdout: '' });
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

    registerAgenticWorkflowProxyCommand(root, runtime);
    await root.parseAsync(['node', 'test', 'aw', 'run']);

    expect(capturedOutput).toBe('');
    expect(capturedError).toBe('workflow warning');
  });
});
