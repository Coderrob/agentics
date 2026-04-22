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
