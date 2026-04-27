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
import { createCommandRuntime, createNodeCommandRuntime, writeJson } from '../runtime.js';

describe('command runtime', () => {
  it('should create a runtime with argv and output writer', () => {
    let capturedOutput = '';
    const runtime = createCommandRuntime(['node', 'agentics'], (output: string) => {
      capturedOutput += output;
    });

    runtime.writeStdout('ok');

    expect(runtime.argv).toEqual(['node', 'agentics']);
    expect(capturedOutput).toBe('ok');
  });

  it('should ignore standard error when no writer is provided', () => {
    const runtime = createCommandRuntime([], () => undefined);

    expect(() => {
      runtime.writeStderr('ignored');
    }).not.toThrow();
  });

  it('should write formatted JSON through the runtime', () => {
    let capturedOutput = '';
    const runtime = createCommandRuntime([], (output: string) => {
      capturedOutput += output;
    });

    writeJson(runtime, { value: true });

    expect(capturedOutput).toBe('{\n  "value": true\n}\n');
  });

  it('should wrap Node process arguments and streams', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementationOnce(() => true);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementationOnce(() => true);

    try {
      const runtime = createNodeCommandRuntime();

      runtime.writeStderr('error');
      runtime.writeStdout('output');

      expect(runtime.argv.length).toBeGreaterThan(0);
      expect(stderrSpy).toHaveBeenNthCalledWith(1, 'error');
      expect(stdoutSpy).toHaveBeenNthCalledWith(1, 'output');
    } finally {
      stderrSpy.mockRestore();
      stdoutSpy.mockRestore();
    }
  });
});
