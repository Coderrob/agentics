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
  ContextCacheArtifactPurpose,
  ContextClaimStatus,
  ContextRefreshMode,
  ContextSummaryKind,
  buildContextCachePlan,
  computeEvidenceOid,
  createContextStateSnapshot,
  createPathHash,
  createRecursiveSummaries,
  parseContextClaims,
  refreshContextClaims,
  selectLiveContextClaims,
  validateContextCache,
  type IContextClaim,
  type IContextFileEvidence,
} from '../context.js';

const FILES: readonly IContextFileEvidence[] = [
  {
    blobOid: 'aaa',
    content: 'export function alpha() {}\n\nexport const beta = 1;',
    path: 'src/index.ts',
  },
  {
    blobOid: 'bbb',
    content: '# Guide\n\nUse this project carefully.',
    path: 'docs/guide.md',
  },
  {
    blobOid: 'ccc',
    content: 'generated lock',
    path: 'workflows/demo.lock.yml',
  },
];

describe('computeEvidenceOid', () => {
  it('should produce stable hashes independent of evidence order', () => {
    const left = computeEvidenceOid([
      { blobOid: 'bbb', path: 'docs/guide.md' },
      { blobOid: 'aaa', path: 'src/index.ts' },
    ]);
    const right = computeEvidenceOid([
      { blobOid: 'aaa', path: 'src/index.ts' },
      { blobOid: 'bbb', path: 'docs/guide.md' },
    ]);

    expect(left).toBe(right);
  });
});

describe('buildContextCachePlan', () => {
  it('should build portable context cache artifacts and label state', () => {
    const plan = buildContextCachePlan({
      changedPaths: ['src/index.ts'],
      existingClaims: [],
      files: FILES,
      generatedAt: '2026-04-28T00:00:00.000Z',
      labels: ['type:feature', 'priority:p1', 'state:needs-context', 'context-cache:refresh'],
      mode: ContextRefreshMode.Full,
    });

    expect(plan.artifacts.map((artifact) => artifact.purpose)).toEqual([
      ContextCacheArtifactPurpose.Summaries,
      ContextCacheArtifactPurpose.Claims,
      ContextCacheArtifactPurpose.Validation,
    ]);
    expect(plan.claims[0]?.status).toBe(ContextClaimStatus.Live);
    expect(plan.stateSnapshot.priorityLabels).toEqual(['priority:p1']);
    expect(plan.stateSnapshot.workflowLabels).toEqual(['context-cache:refresh']);
    expect(plan.validationErrors).toEqual([]);
  });

  it('should use deterministic defaults when timestamp is omitted', () => {
    const plan = buildContextCachePlan({
      changedPaths: [],
      existingClaims: [],
      files: [
        {
          blobOid: 'empty',
          content: '',
          path: '',
        },
      ],
      labels: [],
      mode: ContextRefreshMode.Validate,
    });

    expect(plan.summaries[0]?.updatedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(plan.summaries.some((summary) => summary.summary === 'Empty or whitespace-only file.')).toBe(true);
  });
});

describe('createContextStateSnapshot', () => {
  it('should group labels by state snapshot purpose', () => {
    const snapshot = createContextStateSnapshot([
      'type:docs',
      'priority:p2',
      'state:context-stale',
      'context-cache:claims',
      'unrelated',
    ]);

    expect(snapshot.typeLabels).toEqual(['type:docs']);
    expect(snapshot.priorityLabels).toEqual(['priority:p2']);
    expect(snapshot.stateLabels).toEqual(['state:context-stale']);
    expect(snapshot.workflowLabels).toEqual(['context-cache:claims']);
  });
});

describe('createPathHash', () => {
  it('should create deterministic path hashes', () => {
    expect(createPathHash('src/index.ts')).toBe(createPathHash('src/index.ts'));
  });
});

describe('createRecursiveSummaries', () => {
  it('should summarize files and directories while excluding generated lock files', () => {
    const summaries = createRecursiveSummaries(FILES, '2026-04-28T00:00:00.000Z');
    const paths = summaries.map((summary) => summary.path);

    expect(paths).toContain('.');
    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('workflows/demo.lock.yml');
    expect(summaries.find((summary) => summary.path === 'src/index.ts')?.kind).toBe(ContextSummaryKind.File);
    expect(summaries.find((summary) => summary.path === 'src')?.kind).toBe(ContextSummaryKind.Directory);
  });
});

describe('parseContextClaims', () => {
  it('should parse valid stored claims and ignore invalid shapes', () => {
    const claim: IContextClaim = {
      claim: 'HTTP calls live in src/api.',
      createdAt: '2026-04-28T00:00:00.000Z',
      createdBy: 'human',
      evidence: [{ blobOid: 'aaa', path: 'src/index.ts' }],
      evidenceOid: computeEvidenceOid([{ blobOid: 'aaa', path: 'src/index.ts' }]),
      id: 'claim-1',
      status: ContextClaimStatus.Live,
      updatedAt: '2026-04-28T00:00:00.000Z',
    };

    expect(parseContextClaims({ claims: [claim] })).toEqual([claim]);
    expect(parseContextClaims({ claims: [null] })).toEqual([]);
    expect(
      parseContextClaims({
        claims: [
          {
            ...claim,
            evidence: [null],
          },
        ],
      }),
    ).toEqual([]);
    expect(parseContextClaims({ claims: [{ claim: 'missing fields' }] })).toEqual([]);
    expect(parseContextClaims({ claims: 'invalid' })).toEqual([]);
    expect(parseContextClaims('invalid')).toEqual([]);
  });
});

describe('refreshContextClaims', () => {
  it('should keep claims live when evidence remains unchanged', () => {
    const evidence = [{ blobOid: 'aaa', path: 'src/index.ts' }];
    const claim: IContextClaim = {
      claim: 'Source entrypoint is src/index.ts.',
      createdAt: '2026-04-28T00:00:00.000Z',
      createdBy: 'human',
      evidence,
      evidenceOid: computeEvidenceOid(evidence),
      id: 'claim-live',
      status: ContextClaimStatus.Live,
      updatedAt: '2026-04-28T00:00:00.000Z',
    };

    const claims = refreshContextClaims([claim], FILES, '2026-04-29T00:00:00.000Z');

    expect(claims[0]?.status).toBe(ContextClaimStatus.Live);
    expect(selectLiveContextClaims(claims)).toEqual(claims);
  });

  it('should mark claims stale when evidence paths disappear', () => {
    const evidence = [{ blobOid: 'missing', path: 'missing.ts' }];
    const claim: IContextClaim = {
      claim: 'Missing path claim.',
      createdAt: '2026-04-28T00:00:00.000Z',
      createdBy: 'human',
      evidence,
      evidenceOid: computeEvidenceOid(evidence),
      id: 'claim-gone',
      status: ContextClaimStatus.Live,
      updatedAt: '2026-04-28T00:00:00.000Z',
    };

    const claims = refreshContextClaims([claim], FILES, '2026-04-29T00:00:00.000Z');

    expect(claims[0]?.status).toBe(ContextClaimStatus.Stale);
    expect(claims[0]?.evidence).toEqual([]);
  });

  it('should mark claims stale when evidence blob OIDs change', () => {
    const claim: IContextClaim = {
      claim: 'HTTP calls live in src/api.',
      createdAt: '2026-04-28T00:00:00.000Z',
      createdBy: 'human',
      evidence: [{ blobOid: 'old', path: 'src/index.ts' }],
      evidenceOid: computeEvidenceOid([{ blobOid: 'old', path: 'src/index.ts' }]),
      id: 'claim-1',
      status: ContextClaimStatus.Live,
      updatedAt: '2026-04-28T00:00:00.000Z',
    };

    const claims = refreshContextClaims([claim], FILES, '2026-04-29T00:00:00.000Z');

    expect(claims[0]?.status).toBe(ContextClaimStatus.Stale);
    expect(selectLiveContextClaims(claims)).toEqual([]);
  });
});

describe('validateContextCache', () => {
  it('should report empty summaries and claim evidence mismatches', () => {
    const claim: IContextClaim = {
      claim: 'Missing evidence.',
      createdAt: '2026-04-28T00:00:00.000Z',
      createdBy: 'human',
      evidence: [{ blobOid: 'missing', path: 'missing.ts' }],
      evidenceOid: 'wrong',
      id: 'claim-missing',
      status: ContextClaimStatus.Live,
      updatedAt: '2026-04-28T00:00:00.000Z',
    };

    const errors = validateContextCache([], [claim], FILES);

    expect(errors).toContain('At least one context summary is required.');
    expect(errors).toContain('Missing evidence path for claim claim-missing: missing.ts');
    expect(errors).toContain('Evidence OID mismatch for claim claim-missing.');
  });
});
