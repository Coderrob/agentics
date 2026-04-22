import { describe, expect, it } from 'vitest';
import { analyzeConversation, createArtifactPaths, createRefinementPlan } from '../index.js';

describe('createArtifactPaths', () => {
  it('should build artifact paths from run ID and default dir', () => {
    const paths = createArtifactPaths('run-abc');
    expect(paths.baseDir).toBe('refinements/run-abc');
    expect(paths.prompt).toBe('refinements/run-abc/prompt.txt');
    expect(paths.conversation).toBe('refinements/run-abc/conversation.txt');
    expect(paths.usage).toBe('refinements/run-abc/usage.json');
  });

  it('should use a custom refinements directory when provided', () => {
    const paths = createArtifactPaths('run-xyz', 'custom-dir');
    expect(paths.baseDir).toBe('custom-dir/run-xyz');
    expect(paths.usage).toBe('custom-dir/run-xyz/usage.json');
  });
});

describe('createRefinementPlan', () => {
  it('should build a complete refinement plan', () => {
    const plan = createRefinementPlan('.github/workflows/ci.yml', 'run-42');
    expect(plan.workflowPath).toBe('.github/workflows/ci.yml');
    expect(plan.runId).toBe('run-42');
    expect(plan.commands.compile).toContain('gh aw compile');
    expect(plan.commands.run).toContain('gh aw run');
    expect(plan.commands.downloadArtifacts).toContain('gh run download');
    expect(plan.artifactPaths.baseDir).toBe('refinements/run-42');
  });
});

describe('analyzeConversation', () => {
  it('should detect reasoning mentions in conversation', () => {
    const result = analyzeConversation('The agent was reasoning through the problem carefully.');
    expect(result.redundantReasoningMentions).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should detect tool call mentions in conversation', () => {
    const result = analyzeConversation(
      'invoke tool, invoke tool, invoke tool, invoke tool, call tool again'
    );
    expect(result.toolCallMentions).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.includes('Consolidate'))).toBe(true);
  });

  it('should return lean recommendation when no issues detected', () => {
    const result = analyzeConversation('Everything is clean and efficient.');
    expect(result.recommendations).toContain('Workflow appears lean; benchmark to confirm performance goals.');
  });
});
