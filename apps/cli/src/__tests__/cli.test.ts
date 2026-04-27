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

import { describe, expect, it } from 'vitest';
import { createCliProgram, program } from '../index.js';
import { createCommandRuntime } from '../runtime.js';

describe('cli', () => {
  it('should register refine command', () => {
    const names = program.commands.map((command) => command.name());
    expect(names).toContain('refine');
    expect(names).toContain('workflows');
  });

  it('should register all refine subcommands', () => {
    const refine = program.commands.find((c) => c.name() === 'refine');
    const subNames = refine?.commands.map((c) => c.name()) ?? [];
    expect(subNames).toContain('analyze');
    expect(subNames).toContain('benchmark');
    expect(subNames).toContain('extract');
    expect(subNames).toContain('run');
  });

  it('should write Commander help through the command runtime', () => {
    let capturedOutput = '';
    let capturedError = '';
    const runtime = createCommandRuntime(
      ['node', 'agentics'],
      (output: string) => {
        capturedOutput += output;
      },
      (output: string) => {
        capturedError += output;
      },
    );
    const command = createCliProgram(runtime);

    command.outputHelp();

    expect(capturedOutput).toContain('Usage: agentics');
    expect(capturedOutput).toContain('Workflow refinement commands');
    expect(capturedError).toBe('');
  });

  it('should write Commander errors through the command runtime', async () => {
    let capturedError = '';
    const runtime = createCommandRuntime(
      ['node', 'agentics'],
      () => undefined,
      (output: string) => {
        capturedError += output;
      },
    );
    const command = createCliProgram(runtime);
    command.exitOverride();

    await expect(command.parseAsync(['node', 'agentics', 'missing-command'])).rejects.toThrow();

    expect(capturedError).toContain("error: unknown command 'missing-command'");
  });
});
