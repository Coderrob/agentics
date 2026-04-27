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

import { describe, expect, it, vi } from 'vitest';
import {
  compileWorkflow,
  compileWorkflowCommand,
  downloadArtifacts,
  downloadArtifactsCommand,
  downloadArtifactsWithFallback,
  executeAgenticWorkflowCommand,
  runWorkflow,
  runWorkflowCommand,
} from '../index.js';

const execFileMock = vi.hoisted(() => vi.fn());
const mkdirMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({ execFile: execFileMock }));
vi.mock('node:fs/promises', () => ({ mkdir: mkdirMock }));

const MOCK_STDOUT = 'mock-stdout';
const MOCK_STDERR = '';
const ZERO_DELAY = 0;

describe('github command builders', () => {
  it('should build compile workflow command', () => {
    expect(compileWorkflowCommand('.github/workflows/ci.yml')).toBe(
      'gh aw compile --workflow .github/workflows/ci.yml',
    );
  });

  it('should build download artifacts command', () => {
    expect(downloadArtifactsCommand('run-123', 'refinements/run-123')).toBe(
      'gh run download run-123 -D refinements/run-123',
    );
  });

  it('should build run workflow command', () => {
    expect(runWorkflowCommand('.github/workflows/ci.yml')).toBe('gh aw run --workflow .github/workflows/ci.yml');
  });
});

describe('github async wrappers', () => {
  it('should execute compile workflow', async () => {
    execFileMock.mockImplementationOnce(
      (_cmd: string, _args: readonly string[], cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
        cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
      },
    );
    const result = await compileWorkflow('.github/workflows/ci.yml');
    expect(result.stdout).toBe(MOCK_STDOUT);
    expect(result.stderr).toBe(MOCK_STDERR);
  });

  it('should execute agentic workflow extension command', async () => {
    execFileMock.mockClear();
    execFileMock.mockImplementationOnce(
      (_cmd: string, _args: readonly string[], cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
        cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
      },
    );
    const result = await executeAgenticWorkflowCommand(['list', '--json']);
    expect(execFileMock).toHaveBeenNthCalledWith(1, 'gh', ['aw', 'list', '--json'], expect.any(Function));
    expect(result.stdout).toBe(MOCK_STDOUT);
    expect(result.stderr).toBe(MOCK_STDERR);
  });

  it('should download artifacts and create output dir', async () => {
    mkdirMock.mockImplementationOnce(() => Promise.resolve());
    execFileMock.mockImplementationOnce(
      (_cmd: string, _args: readonly string[], cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
        cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
      },
    );
    const result = await downloadArtifacts('run-123', 'refinements/run-123');
    expect(result.stdout).toBe(MOCK_STDOUT);
  });

  it('should return primary download when it succeeds', async () => {
    mkdirMock.mockImplementationOnce(() => Promise.resolve());
    execFileMock.mockImplementationOnce(
      (_cmd: string, _args: readonly string[], cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
        cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
      },
    );
    const result = await downloadArtifactsWithFallback('run-123', 'out/');
    expect(result.stdout).toBe(MOCK_STDOUT);
  });

  it('should re-throw when primary fails and no fallback is set', async () => {
    mkdirMock.mockImplementationOnce(() => Promise.resolve());
    execFileMock.mockImplementationOnce((_cmd: string, _args: readonly string[], cb: (e: Error) => void) => {
      cb(new Error('download failed'));
    });
    await expect(downloadArtifactsWithFallback('run-123', 'out/')).rejects.toThrow('download failed');
  });

  it('should retry via fallback workflow when primary fails', async () => {
    mkdirMock.mockImplementationOnce(() => Promise.resolve());
    execFileMock.mockImplementationOnce((_cmd: string, _args: readonly string[], cb: (e: Error) => void) => {
      cb(new Error('not found'));
    });
    execFileMock.mockImplementationOnce(
      (_cmd: string, _args: readonly string[], cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
        cb(null, { stdout: '', stderr: '' });
      },
    );
    mkdirMock.mockImplementationOnce(() => Promise.resolve());
    execFileMock.mockImplementationOnce(
      (_cmd: string, _args: readonly string[], cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
        cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
      },
    );
    const result = await downloadArtifactsWithFallback('run-123', 'out/', {
      fallbackWorkflow: 'fallback.yml',
      retryDelayMs: ZERO_DELAY,
    });
    expect(result.stdout).toBe(MOCK_STDOUT);
  });

  it('should execute run workflow', async () => {
    execFileMock.mockImplementationOnce(
      (_cmd: string, _args: readonly string[], cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
        cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
      },
    );
    const result = await runWorkflow('.github/workflows/ci.yml');
    expect(result.stdout).toBe(MOCK_STDOUT);
  });
});
