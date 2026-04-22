import { describe, expect, it } from 'vitest';
import { program } from '../index.js';

describe('cli', () => {
  it('registers refine command', () => {
    const names = program.commands.map((command) => command.name());
    expect(names).toContain('refine');
  });
});
