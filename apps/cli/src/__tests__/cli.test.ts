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

import { describe, expect, it } from 'vitest';
import { program } from '../index.js';

describe('cli', () => {
  it('should register refine command', () => {
    const names = program.commands.map((command) => command.name());
    expect(names).toContain('refine');
  });

  it('should register all refine subcommands', () => {
    const refine = program.commands.find((c) => c.name() === 'refine');
    const subNames = refine?.commands.map((c) => c.name()) ?? [];
    expect(subNames).toContain('analyze');
    expect(subNames).toContain('benchmark');
    expect(subNames).toContain('extract');
    expect(subNames).toContain('run');
  });
});
