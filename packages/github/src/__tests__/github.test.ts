import { describe, expect, it, vi } from 'vitest';
import {
  compileWorkflow,
  compileWorkflowCommand,
  downloadArtifacts,
  downloadArtifactsCommand,
  downloadArtifactsWithFallback,
  runWorkflow,
  runWorkflowCommand
} from '../index.js';

const execMock = vi.hoisted(() => vi.fn());
const mkdirMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({ exec: execMock }));
vi.mock('node:fs/promises', () => ({ mkdir: mkdirMock }));

const MOCK_STDOUT = 'mock-stdout';
const MOCK_STDERR = '';
const ZERO_DELAY = 0;

describe('github command builders', () => {
  it('should build compile workflow command', () => {
    expect(compileWorkflowCommand('.github/workflows/ci.yml')).toBe(
      'gh aw compile --workflow .github/workflows/ci.yml'
    );
  });

  it('should build run workflow command', () => {
    expect(runWorkflowCommand('.github/workflows/ci.yml')).toBe(
      'gh aw run --workflow .github/workflows/ci.yml'
    );
  });

  it('should build download artifacts command', () => {
    expect(downloadArtifactsCommand('run-123', 'refinements/run-123')).toBe(
      'gh run download run-123 -D refinements/run-123'
    );
  });
});

describe('github async wrappers', () => {
  it('should execute compile workflow', async () => {
    execMock.mockImplementationOnce((_cmd: string, cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
      cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
    });
    const result = await compileWorkflow('.github/workflows/ci.yml');
    expect(result.stdout).toBe(MOCK_STDOUT);
    expect(result.stderr).toBe(MOCK_STDERR);
  });

  it('should execute run workflow', async () => {
    execMock.mockImplementationOnce((_cmd: string, cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
      cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
    });
    const result = await runWorkflow('.github/workflows/ci.yml');
    expect(result.stdout).toBe(MOCK_STDOUT);
  });

  it('should download artifacts and create output dir', async () => {
    mkdirMock.mockImplementationOnce(() => Promise.resolve());
    execMock.mockImplementationOnce((_cmd: string, cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
      cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
    });
    const result = await downloadArtifacts('run-123', 'refinements/run-123');
    expect(result.stdout).toBe(MOCK_STDOUT);
  });

  it('should return primary download when it succeeds', async () => {
    mkdirMock.mockImplementationOnce(() => Promise.resolve());
    execMock.mockImplementationOnce((_cmd: string, cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
      cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
    });
    const result = await downloadArtifactsWithFallback('run-123', 'out/');
    expect(result.stdout).toBe(MOCK_STDOUT);
  });

  it('should re-throw when primary fails and no fallback is set', async () => {
    mkdirMock.mockImplementationOnce(() => Promise.resolve());
    execMock.mockImplementationOnce((_cmd: string, cb: (e: Error) => void) => {
      cb(new Error('download failed'));
    });
    await expect(downloadArtifactsWithFallback('run-123', 'out/')).rejects.toThrow('download failed');
  });

  it('should retry via fallback workflow when primary fails', async () => {
    mkdirMock.mockImplementationOnce(() => Promise.resolve());
    // primary download fails
    execMock.mockImplementationOnce((_cmd: string, cb: (e: Error) => void) => {
      cb(new Error('not found'));
    });
    // trigger fallback workflow
    execMock.mockImplementationOnce((_cmd: string, cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
      cb(null, { stdout: '', stderr: '' });
    });
    // mkdir for retry
    mkdirMock.mockImplementationOnce(() => Promise.resolve());
    // retry download succeeds
    execMock.mockImplementationOnce((_cmd: string, cb: (e: null, r: { stdout: string; stderr: string }) => void) => {
      cb(null, { stdout: MOCK_STDOUT, stderr: MOCK_STDERR });
    });
    const result = await downloadArtifactsWithFallback('run-123', 'out/', {
      fallbackWorkflow: 'fallback.yml',
      retryDelayMs: ZERO_DELAY
    });
    expect(result.stdout).toBe(MOCK_STDOUT);
  });
});
