import type { Candidate, Audition } from '../types';

/**
 * 특정 심사위원이 특정 참가자에게 부여한 합계 점수를 계산합니다.
 */
export const getJudgeScore = (candidate: Candidate, judgeName: string, audition: Audition) => {
  const s = candidate.scores[judgeName];
  if (!s || !s.isCompleted) return null;
  
  const judgeConfig = audition.judges.find(j => j.name === judgeName);
  if (!judgeConfig) return null;

  if (judgeConfig.type === 'simple') return s.simpleTotal || 0;
  
  if (judgeConfig.type === 'detail') {
    const items = judgeConfig.criteria?.map(c => c.item) || [];
    return items.reduce((sum: number, item) => sum + (Number((s as any)[item]) || 0), 0);
  }

  return null;
};

export const calculateStats = (candidates: Candidate[], audition: Audition) => {
  if (candidates.length === 0 || !audition) return null;

  const validJudges = audition.judges.filter(j => j.type !== 'observer').map(j => j.name);

  // 1. 심사위원별 통계 (점수를 매기지 않는 '참관자' 제외)
  const judgeStats = validJudges.map(judge => {
    const scores = candidates
      .map(c => getJudgeScore(c, judge, audition))
      .filter((s): s is number => s !== null);

    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      
    return {
      judgeName: judge,
      averageScore: Number(average.toFixed(1)),
      count: scores.length
    };
  });

  // 2. 후보자별 심사위원 간 편차
  const candidateStats = candidates.map(c => {
    const judgeScores = validJudges
      .map(j => getJudgeScore(c, j, audition))
      .filter((s): s is number => s !== null);

    if (judgeScores.length < 2) return { id: c.id, name: c.name, std: 0, spread: 0 };

    const avg = judgeScores.reduce((a, b) => a + b, 0) / judgeScores.length;
    const std = Math.sqrt(judgeScores.reduce((a, b) => a + (b - avg) ** 2, 0) / judgeScores.length);
    const spread = Math.max(...judgeScores) - Math.min(...judgeScores);

    return {
      id: c.id,
      name: c.name,
      std: Number(std.toFixed(2)),
      spread
    };
  });

  return {
    judgeStats,
    candidateStats
  };
};
