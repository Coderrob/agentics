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
import {
  WorkflowCategory,
  WorkflowFactoryArtifactPurpose,
  analyzeConversation,
  createArtifactPaths,
  createRefinementPlan,
  createWorkflowFactoryPlan,
  createWorkflowRequest,
  deriveWorkflowSpec,
  renderWorkflowArtifacts,
  validateWorkflowFactoryArtifacts,
} from '../index.js';

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

describe('createWorkflowFactoryPlan', () => {
  it('should build a workflow factory plan with artifacts and validation', () => {
    const request = createWorkflowRequest({
      author: 'octocat',
      body: 'I need a workflow that analyzes stale documentation.',
      issueNumber: 123,
      labels: ['workflow', 'workflow:requested'],
      title: 'workflow: stale docs analysis',
    });

    const plan = createWorkflowFactoryPlan(request);

    expect(plan.request.issueNumber).toBe(123);
    expect(plan.spec.category).toBe(WorkflowCategory.Analysis);
    expect(plan.artifacts.length).toBe(2);
    expect(plan.validationErrors).toEqual([]);
  });
});

describe('createWorkflowRequest', () => {
  it('should normalize partial workflow issue input', () => {
    const request = createWorkflowRequest({
      body: '  I need   workflow help. ',
      title: ' workflow:   Example Workflow ',
    });

    expect(request.author).toBe('unknown');
    expect(request.body).toBe('I need workflow help.');
    expect(request.labels).toEqual(['workflow']);
    expect(request.title).toBe('workflow: Example Workflow');
  });
});

describe('deriveWorkflowSpec', () => {
  it('should derive a generated workflow spec when no category language matches', () => {
    const request = createWorkflowRequest({
      body: 'I need a workflow that creates release notes.',
      title: '',
    });

    const spec = deriveWorkflowSpec(request);

    expect(spec.category).toBe(WorkflowCategory.Generation);
    expect(spec.name).toBe('generated-workflow');
  });

  it('should derive an evaluation workflow spec from benchmark language', () => {
    const request = createWorkflowRequest({
      body: 'I need a workflow that benchmarks candidate usage files.',
      title: 'workflow: benchmark usage',
    });

    const spec = deriveWorkflowSpec(request);

    expect(spec.category).toBe(WorkflowCategory.Evaluation);
    expect(spec.name).toBe('benchmark-usage');
    expect(spec.safeOutputs).toContain('proposed-file-changes');
  });
});

describe('renderWorkflowArtifacts', () => {
  it('should render workflow and documentation artifact proposals', () => {
    const spec = deriveWorkflowSpec(
      createWorkflowRequest({
        body: 'I need a workflow that improves prompts.',
        title: 'workflow: improve prompts',
      }),
    );

    const artifacts = renderWorkflowArtifacts(spec);

    expect(artifacts[0]?.content).toContain('---');
    expect(artifacts[0]?.content).toContain('# improve-prompts');
    expect(artifacts[0]?.path).toBe('workflows/improve-prompts.md');
    expect(artifacts[0]?.purpose).toBe(WorkflowFactoryArtifactPurpose.Workflow);
    expect(artifacts[1]?.purpose).toBe(WorkflowFactoryArtifactPurpose.Docs);
  });
});

describe('validateWorkflowFactoryArtifacts', () => {
  it('should report missing generated workflow requirements', () => {
    const errors = validateWorkflowFactoryArtifacts(
      {
        acceptanceCriteria: [],
        category: WorkflowCategory.Generation,
        description: '',
        inputs: {},
        mcpTools: [],
        name: '',
        outputs: {},
        permissions: {},
        safeOutputs: [],
        steps: [],
      },
      [],
    );

    expect(errors).toContain('Workflow name is required.');
    expect(errors).toContain('A workflow artifact is required.');
  });
});

describe('analyzeConversation', () => {
  it('should detect reasoning mentions in conversation', () => {
    const result = analyzeConversation('The agent was reasoning through the problem carefully.');
    expect(result.redundantReasoningMentions).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should detect tool call mentions in conversation', () => {
    const result = analyzeConversation('invoke tool, invoke tool, invoke tool, invoke tool, call tool again');
    expect(result.toolCallMentions).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.includes('Consolidate'))).toBe(true);
  });

  it('should return lean recommendation when no issues detected', () => {
    const result = analyzeConversation('Everything is clean and efficient.');
    expect(result.recommendations).toContain('Workflow appears lean; benchmark to confirm performance goals.');
  });
});
