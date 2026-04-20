import { DEFAULT_RANKING_POLICY, normalizeRankingPolicy } from './rankingUtils.ts';
import type { Audition, Candidate, EvaluationScores, FinalizationState, JudgeConfig, TimestampLike, TrashBatch } from '../types';

export const createDefaultFinalizationState = (): FinalizationState => ({
  isFinalized: false,
  finalizedAt: null,
  lastSnapshot: null,
  reopenCount: 0,
  reopenedAt: null,
});

export const sanitizeJudgeConfigs = (judges: JudgeConfig[]): JudgeConfig[] =>
  judges.map((judge) => {
    const baseJudge = {
      name: judge.name.trim(),
      pin: judge.pin.trim(),
      type: judge.type,
    };

    if (judge.type !== 'detail') {
      return baseJudge;
    }

    return {
      ...baseJudge,
      criteria: (judge.criteria ?? []).map((criterion) => ({
        item: criterion.item.trim(),
        maxScore: Number(criterion.maxScore) || 0,
      })),
    };
  });

export const createDefaultAuditionPayload = (name: string, adminPin: string) => ({
  name,
  status: 'active' as const,
  activeJudges: [] as string[],
  judges: [] as JudgeConfig[],
  dropCount: 0,
  adminPin,
  rankingPolicy: DEFAULT_RANKING_POLICY,
  finalization: createDefaultFinalizationState(),
  unlocks: [],
});

export const mapAuditionRecord = (id: string, raw: Record<string, unknown>, adminPin: string): Audition => ({
  id,
  name: typeof raw.name === 'string' ? raw.name : '이름 없는 오디션',
  status: raw.status === 'archived' ? 'archived' : 'active',
  activeJudges: Array.isArray(raw.activeJudges) ? raw.activeJudges.filter((judge): judge is string => typeof judge === 'string') : [],
  judges: Array.isArray(raw.judges) ? (raw.judges as JudgeConfig[]) : [],
  dropCount: typeof raw.dropCount === 'number' ? raw.dropCount : 0,
  adminPin,
  rankingPolicy: normalizeRankingPolicy(raw.rankingPolicy as Audition['rankingPolicy'] | undefined),
  finalization:
    typeof raw.finalization === 'object' && raw.finalization !== null
      ? {
          ...createDefaultFinalizationState(),
          ...(raw.finalization as FinalizationState),
          lastSnapshot:
            typeof (raw.finalization as FinalizationState).lastSnapshot === 'object'
              ? (raw.finalization as FinalizationState).lastSnapshot
              : null,
        }
      : createDefaultFinalizationState(),
  unlocks: Array.isArray(raw.unlocks) ? (raw.unlocks as Audition['unlocks']) : [],
  createdAt: raw.createdAt as TimestampLike,
  updatedAt: raw.updatedAt as TimestampLike,
});

export const mapCandidateRecord = (id: string, raw: Record<string, unknown>): Candidate => ({
  id,
  auditionId: typeof raw.auditionId === 'string' ? raw.auditionId : undefined,
  name: typeof raw.name === 'string' ? raw.name : '이름 없는 팀',
  song: typeof raw.song === 'string' ? raw.song : '',
  scores: (raw.scores as Candidate['scores']) ?? {},
  comments: Array.isArray(raw.comments) ? (raw.comments as Candidate['comments']) : [],
  total: typeof raw.total === 'number' ? raw.total : 0,
  average: typeof raw.average === 'number' ? raw.average : 0,
  createdAt: raw.createdAt as TimestampLike,
  updatedAt: raw.updatedAt as TimestampLike,
});

export const mapTrashBatchRecord = (id: string, raw: Record<string, unknown>): TrashBatch => ({
  id,
  auditionId: String(raw.auditionId ?? ''),
  auditionName: String(raw.auditionName ?? '삭제된 오디션'),
  candidateCount: typeof raw.candidateCount === 'number' ? raw.candidateCount : 0,
  candidatePreview: Array.isArray(raw.candidatePreview)
    ? raw.candidatePreview.filter((item): item is string => typeof item === 'string')
    : [],
  deletedAt: raw.deletedAt as TimestampLike,
  expiresAt: raw.expiresAt as TimestampLike,
  deletedBy: String(raw.deletedBy ?? 'ADMIN'),
  status:
    raw.status === 'restored' || raw.status === 'purged'
      ? raw.status
      : 'active',
  restoredAt: raw.restoredAt as TimestampLike,
  purgedAt: raw.purgedAt as TimestampLike,
  auditionSnapshot: raw.auditionSnapshot as TrashBatch['auditionSnapshot'],
});

export const buildInitialCandidateScores = (audition: Audition): Candidate['scores'] =>
  audition.judges.reduce<Record<string, EvaluationScores>>((accumulator, judge) => {
    const baseScore: EvaluationScores = {
      strikes: 0,
      itemStrikes: {},
      isCompleted: false,
    };

    if (judge.type === 'detail') {
      (judge.criteria ?? []).forEach((criterion) => {
        baseScore[criterion.item] = null;
        (baseScore.itemStrikes ?? {})[criterion.item] = 0;
      });
    }

    if (judge.type === 'simple') {
      baseScore.simpleTotal = null;
      (baseScore.itemStrikes ?? {}).simple = 0;
    }

    accumulator[judge.name] = baseScore;
    return accumulator;
  }, {});
