import { describe, expect, it } from 'vitest';
import type { Audition, Candidate } from '../types';
import { canEditCandidateScore, rankCandidates } from './rankingUtils.ts';

const createAudition = (overrides?: Partial<Audition>): Audition => ({
  id: 'audition-1',
  name: '봄 오디션',
  status: 'active',
  activeJudges: ['심사1', '심사2', '참관자'],
  judges: [
    { name: '심사1', pin: '111111', type: 'simple' },
    { name: '심사2', pin: '222222', type: 'simple' },
    { name: '참관자', pin: '333333', type: 'observer' },
  ],
  dropCount: 0,
  adminPin: '123456',
  rankingPolicy: {
    id: 'average-total-name',
    label: '평균 → 총점 → 이름순',
    criteria: ['average', 'total', 'name'],
  },
  finalization: {
    isFinalized: false,
    finalizedAt: null,
    lastSnapshot: null,
    reopenCount: 0,
    reopenedAt: null,
  },
  unlocks: [],
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

const createCandidate = (id: string, name: string, scores: Candidate['scores']): Candidate => ({
  id,
  name,
  song: `${name} 대표곡`,
  scores,
  comments: [],
  total: 0,
  average: 0,
  updatedAt: null,
});

describe('rankCandidates', () => {
  it('기본 정책에서 평균 → 총점 → 이름순으로 정렬한다', () => {
    const audition = createAudition();
    const candidates: Candidate[] = [
      createCandidate('c-1', '베타', {
        심사1: { simpleTotal: 90, isCompleted: true },
        심사2: { simpleTotal: 90, isCompleted: true },
        참관자: { simpleTotal: 10, isCompleted: true },
      }),
      createCandidate('c-2', '알파', {
        심사1: { simpleTotal: 95, isCompleted: true },
        심사2: { simpleTotal: 85, isCompleted: true },
      }),
      createCandidate('c-3', '감마', {
        심사1: { simpleTotal: 88, isCompleted: true },
        심사2: { simpleTotal: 92, isCompleted: true },
      }),
    ];

    const ranked = rankCandidates(candidates, audition);

    expect(ranked.map((candidate) => candidate.name)).toEqual(['감마', '베타', '알파']);
    expect(ranked.map((candidate) => candidate.rank)).toEqual([1, 2, 3]);
    expect(ranked[0]?.average).toBe(90);
    expect(ranked[0]?.total).toBe(180);
  });

  it('observer 점수는 순위 계산에서 제외한다', () => {
    const audition = createAudition({
      activeJudges: ['심사1', '참관자'],
    });
    const candidates: Candidate[] = [
      createCandidate('c-1', '하나', {
        심사1: { simpleTotal: 80, isCompleted: true },
        참관자: { simpleTotal: 100, isCompleted: true },
      }),
      createCandidate('c-2', '둘', {
        심사1: { simpleTotal: 85, isCompleted: true },
        참관자: { simpleTotal: 0, isCompleted: true },
      }),
    ];

    const ranked = rankCandidates(candidates, audition);

    expect(ranked.map((candidate) => candidate.name)).toEqual(['둘', '하나']);
    expect(ranked[0]?.average).toBe(85);
    expect(ranked[1]?.average).toBe(80);
  });
});

describe('canEditCandidateScore', () => {
  it('확정 전에는 모든 팀 수정이 가능하다', () => {
    const audition = createAudition();

    expect(canEditCandidateScore(audition, 'team-1')).toBe(true);
  });

  it('확정 후에는 잠금 해제된 팀만 수정 가능하다', () => {
    const audition = createAudition({
      finalization: {
        isFinalized: true,
        finalizedAt: '2026-04-21T10:00:00.000Z',
        reopenCount: 0,
        reopenedAt: null,
        lastSnapshot: {
          id: 'snapshot-1',
          generatedAt: '2026-04-21T10:00:00.000Z',
          policyId: 'average-total-name',
          candidateCount: 2,
          entries: [],
        },
      },
      unlocks: [
        {
          candidateId: 'team-2',
          candidateName: '열린 팀',
          unlockedAt: '2026-04-21T10:05:00.000Z',
          unlockedBy: 'ADMIN',
        },
      ],
    });

    expect(canEditCandidateScore(audition, 'team-1')).toBe(false);
    expect(canEditCandidateScore(audition, 'team-2')).toBe(true);
  });
});
