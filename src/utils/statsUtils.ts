import type { Candidate, JudgeName } from '../types';
import { JUDGES, SIMPLE_JUDGES } from '../types';

export interface JudgeStats {
  judgeName: JudgeName;
  averageScore: number;
  participationRate: number;
  avgDeviation: number; // 전체 평균 대비 해당 심사위원의 평균 편차
}

export interface CandidateStats {
  candidateId: string;
  candidateName: string;
  standardDeviation: number; // 심사위원 간 점수의 표준편차 (점수가 고른지 확인)
  spread: number; // 최고점 - 최저점
}

export const calculateStats = (candidates: Candidate[]) => {
  if (candidates.length === 0) return null;

  // 1. 심사위원별 통계 (점수를 매기지 않는 '참관자'는 제외)
  const judgeStats = JUDGES
    .filter(judge => judge !== '참관자')
    .map(judge => {
      const scores = candidates
        .map(c => {
          const s = c.scores[judge];
          if (!s || !s.isCompleted) return null;
          if (SIMPLE_JUDGES.includes(judge)) return s.simpleTotal || 0;
          // 상세 심사위원은 총점 계산
          return Object.entries(s)
            .filter(([key]) => !['isCompleted', 'simpleTotal', 'itemStrikes', 'strikes'].includes(key))
            .reduce((sum, [_, val]) => sum + (Number(val) || 0), 0);
        })
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
    const judgeScores = JUDGES.map(j => {
      const s = c.scores[j];
      if (!s || !s.isCompleted) return null;
      if (SIMPLE_JUDGES.includes(j)) return s.simpleTotal || 0;
      return Object.entries(s)
        .filter(([key]) => !['isCompleted', 'simpleTotal', 'itemStrikes', 'strikes'].includes(key))
        .reduce((sum, [_, val]) => sum + (Number(val) || 0), 0);
    }).filter((s): s is number => s !== null);

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
