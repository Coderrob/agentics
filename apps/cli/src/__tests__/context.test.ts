// Copyright 2026 Robert Lindley
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// you may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { registerContextCommands } from '../commands/context.js';
import { createCommandRuntime } from '../runtime.js';

describe('context commands', () => {
  it('should dry-run full context cache generation for a target repository', async () => {
    let capturedOutput = '';
    const root = new Command();
    const runtime = createCommandRuntime([], (output: string) => {
      capturedOutput += output;
    });

    registerContextCommands(root, runtime);
    await root.parseAsync([
      'node',
      'test',
      'context',
      'build',
      '--repo-root',
      '../..',
      '--label',
      'type:maintenance',
      'state:needs-context',
    ]);

    const result = JSON.parse(capturedOutput);
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(result.stateSnapshot.stateLabels).toEqual(['state:needs-context']);
    expect(result.stateSnapshot.typeLabels).toEqual(['type:maintenance']);
  });

  it('should dry-run context claim refresh for a target repository', async () => {
    let capturedOutput = '';
    const root = new Command();
    const runtime = createCommandRuntime([], (output: string) => {
      capturedOutput += output;
    });

    registerContextCommands(root, runtime);
    await root.parseAsync(['node', 'test', 'context', 'claims', 'refresh', '--repo-root', '../..']);

    const result = JSON.parse(capturedOutput);
    expect(result.claims.length).toBeGreaterThan(0);
    expect(result.artifacts.length).toBeGreaterThan(0);
  });

  it('should dry-run context summary generation for a target repository', async () => {
    let capturedOutput = '';
    const root = new Command();
    const runtime = createCommandRuntime([], (output: string) => {
      capturedOutput += output;
    });

    registerContextCommands(root, runtime);
    await root.parseAsync(['node', 'test', 'context', 'summarize', '--repo-root', '../..']);

    const result = JSON.parse(capturedOutput);
    expect(result.summaries.length).toBeGreaterThan(0);
    expect(result.artifacts.length).toBeGreaterThan(0);
  });

  it('should dry-run context validation for a target repository', async () => {
    let capturedOutput = '';
    const root = new Command();
    const runtime = createCommandRuntime([], (output: string) => {
      capturedOutput += output;
    });

    registerContextCommands(root, runtime);
    await root.parseAsync([
      'node',
      'test',
      'context',
      'validate',
      '--repo-root',
      '../..',
      '--label',
      'type:maintenance',
      'context-cache:refresh',
    ]);

    const result = JSON.parse(capturedOutput);
    expect(result.stateSnapshot.typeLabels).toEqual(['type:maintenance']);
    expect(result.stateSnapshot.workflowLabels).toEqual(['context-cache:refresh']);
    expect(result.artifacts.length).toBeGreaterThan(0);
  });
});
