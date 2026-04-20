import type {
  Audition,
  Candidate,
  PrintReportSnapshot,
  ProgressSnapshot,
  RankedCandidate,
  RankingCriterion,
  RankingPolicy,
  RankingSnapshot,
  RankingSnapshotEntry,
} from '../types';

export const DEFAULT_RANKING_POLICY: RankingPolicy = {
  id: 'average-total-name',
  label: '평균 → 총점 → 이름순',
  criteria: ['average', 'total', 'name'],
};

export const RANKING_POLICY_OPTIONS: RankingPolicy[] = [
  DEFAULT_RANKING_POLICY,
  {
    id: 'total-average-name',
    label: '총점 → 평균 → 이름순',
    criteria: ['total', 'average', 'name'],
  },
  {
    id: 'name-average-total',
    label: '이름순 → 평균 → 총점',
    criteria: ['name', 'average', 'total'],
  },
];

const getRankingPolicyComparator = (criterion: RankingCriterion) => {
  switch (criterion) {
    case 'name':
      return (left: RankedCandidate, right: RankedCandidate) => left.name.localeCompare(right.name, 'ko-KR');
    case 'total':
      return (left: RankedCandidate, right: RankedCandidate) => right.total - left.total;
    case 'average':
    default:
      return (left: RankedCandidate, right: RankedCandidate) => right.average - left.average;
  }
};

export const normalizeRankingPolicy = (policy?: RankingPolicy | null): RankingPolicy => {
  if (!policy || policy.criteria.length === 0) {
    return DEFAULT_RANKING_POLICY;
  }

  const matchedOption = RANKING_POLICY_OPTIONS.find((option) => option.id === policy.id);
  return matchedOption ?? policy;
};

export const getScoringJudges = (audition: Audition): string[] => {
  const nonObserverJudges = audition.judges.filter((judge) => judge.type !== 'observer').map((judge) => judge.name);

  if (!audition.activeJudges || audition.activeJudges.length === 0) {
    return nonObserverJudges;
  }

  return audition.activeJudges.filter((judgeName) => {
    const judgeConfig = audition.judges.find((judge) => judge.name === judgeName);
    return judgeConfig?.type !== 'observer';
  });
};

export const getJudgeScore = (
  candidate: Candidate,
  judgeName: string,
  audition: Audition,
  requireCompleted = true,
): number | null => {
  const judgeConfig = audition.judges.find((judge) => judge.name === judgeName);
  const scores = candidate.scores[judgeName];

  if (!judgeConfig || judgeConfig.type === 'observer' || !scores) {
    return null;
  }

  if (requireCompleted && !scores.isCompleted) {
    return null;
  }

  if (judgeConfig.type === 'simple') {
    return typeof scores.simpleTotal === 'number' ? scores.simpleTotal : null;
  }

  const criteria = judgeConfig.criteria ?? [];
  const values = criteria
    .map((criterion) => scores[criterion.item])
    .filter((value): value is number => typeof value === 'number');

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
};

const buildRankingEntry = (candidate: Candidate, audition: Audition): RankedCandidate => {
  const scoringJudges = getScoringJudges(audition);
  const judgeTotals = scoringJudges.reduce<Record<string, number>>((accumulator, judgeName) => {
    const score = getJudgeScore(candidate, judgeName, audition);
    if (typeof score === 'number') {
      accumulator[judgeName] = score;
    }
    return accumulator;
  }, {});

  const total = Object.values(judgeTotals).reduce((sum, score) => sum + score, 0);
  const completedJudgeCount = Object.keys(judgeTotals).length;
  const expectedJudgeCount = scoringJudges.length;
  const average = completedJudgeCount > 0 ? Number((total / completedJudgeCount).toFixed(2)) : 0;
  const isUnlocked = audition.unlocks.some((unlock) => unlock.candidateId === candidate.id);

  return {
    ...candidate,
    rank: 0,
    total,
    average,
    completedJudgeCount,
    expectedJudgeCount,
    isFullyCompleted: expectedJudgeCount > 0 && completedJudgeCount === expectedJudgeCount,
    judgeTotals,
    isUnlocked,
  };
};

export const rankCandidates = (candidates: Candidate[], audition: Audition): RankedCandidate[] => {
  const rankingPolicy = normalizeRankingPolicy(audition.rankingPolicy);
  const comparators = rankingPolicy.criteria.map(getRankingPolicyComparator);

  return candidates
    .map((candidate) => buildRankingEntry(candidate, audition))
    .sort((left, right) => {
      for (const compare of comparators) {
        const result = compare(left, right);
        if (result !== 0) {
          return result;
        }
      }

      return left.id.localeCompare(right.id);
    })
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
};

export const canEditCandidateScore = (audition: Audition, candidateId: string) => {
  if (!audition.finalization.isFinalized) {
    return true;
  }

  return audition.unlocks.some((unlock) => unlock.candidateId === candidateId);
};

const buildSnapshotEntries = (rankedCandidates: RankedCandidate[]): RankingSnapshotEntry[] =>
  rankedCandidates.map((candidate) => ({
    candidateId: candidate.id,
    candidateName: candidate.name,
    song: candidate.song ?? '',
    rank: candidate.rank,
    total: candidate.total,
    average: candidate.average,
    completedJudgeCount: candidate.completedJudgeCount,
    expectedJudgeCount: candidate.expectedJudgeCount,
    isFullyCompleted: candidate.isFullyCompleted,
    judgeTotals: candidate.judgeTotals,
  }));

export const createRankingSnapshot = (
  audition: Audition,
  candidates: Candidate[],
  generatedAt: string = new Date().toISOString(),
): RankingSnapshot => {
  const rankedCandidates = rankCandidates(candidates, audition);
  return {
    id: `snapshot-${generatedAt}`,
    generatedAt,
    policyId: normalizeRankingPolicy(audition.rankingPolicy).id,
    candidateCount: rankedCandidates.length,
    entries: buildSnapshotEntries(rankedCandidates),
  };
};

export const buildProgressSnapshot = (candidates: Candidate[], audition: Audition): ProgressSnapshot => {
  const scoringJudges = getScoringJudges(audition);

  const judges = scoringJudges.map((judgeName) => {
    const completedCount = candidates.filter((candidate) => candidate.scores[judgeName]?.isCompleted).length;
    const missingComments = candidates.filter((candidate) => {
      if (!candidate.scores[judgeName]?.isCompleted) {
        return false;
      }

      return !candidate.comments?.some((comment) => comment.author === judgeName && comment.content.trim().length > 0);
    }).length;

    return {
      judgeName,
      completedCount,
      totalCount: candidates.length,
      completionRate: candidates.length > 0 ? Math.round((completedCount / candidates.length) * 100) : 0,
      missingComments,
    };
  });

  const candidateItems = rankCandidates(candidates, audition).map((candidate) => {
    const missingScores = Math.max(0, candidate.expectedJudgeCount - candidate.completedJudgeCount);
    const missingComments = scoringJudges.reduce((count, judgeName) => {
      if (!candidate.scores[judgeName]?.isCompleted) {
        return count;
      }

      const hasComment = candidate.comments?.some((comment) => comment.author === judgeName && comment.content.trim().length > 0);
      return hasComment ? count : count + 1;
    }, 0);

    return {
      candidateId: candidate.id,
      candidateName: candidate.name,
      completedJudgeCount: candidate.completedJudgeCount,
      expectedJudgeCount: candidate.expectedJudgeCount,
      completionRate:
        candidate.expectedJudgeCount > 0 ? Math.round((candidate.completedJudgeCount / candidate.expectedJudgeCount) * 100) : 0,
      missingScores,
      missingComments,
      isUnlocked: candidate.isUnlocked,
    };
  });

  return {
    judges,
    candidates: candidateItems,
    totals: {
      candidateCount: candidates.length,
      completedCandidates: candidateItems.filter((candidate) => candidate.completionRate === 100).length,
      inProgressCandidates: candidateItems.filter(
        (candidate) => candidate.completionRate > 0 && candidate.completionRate < 100,
      ).length,
      unlockedCandidates: candidateItems.filter((candidate) => candidate.isUnlocked).length,
      missingScoreCount: candidateItems.reduce((sum, candidate) => sum + candidate.missingScores, 0),
      missingCommentCount: candidateItems.reduce((sum, candidate) => sum + candidate.missingComments, 0),
    },
  };
};

export const buildPrintReportSnapshot = (audition: Audition, candidates: Candidate[]): PrintReportSnapshot => {
  const rankingSource = audition.finalization.lastSnapshot ?? createRankingSnapshot(audition, candidates);

  return {
    auditionId: audition.id,
    auditionName: audition.name,
    finalizedAt: audition.finalization.finalizedAt,
    policyLabel: normalizeRankingPolicy(audition.rankingPolicy).label,
    rankings: rankingSource.entries,
    judges: audition.judges,
    progress: buildProgressSnapshot(candidates, audition),
  };
};
