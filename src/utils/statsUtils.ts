import type { Candidate, Audition } from '../types';
import { getJudgeScore, getScoringJudges } from './rankingUtils.ts';

export { getJudgeScore } from './rankingUtils.ts';

export const calculateStats = (candidates: Candidate[], audition: Audition) => {
  if (candidates.length === 0) {
    return null;
  }

  const validJudges = getScoringJudges(audition);

  const judgeStats = validJudges.map((judge) => {
    const scores = candidates
      .map((candidate) => getJudgeScore(candidate, judge, audition))
      .filter((score): score is number => score !== null);

    const average = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    return {
      judgeName: judge,
      averageScore: Number(average.toFixed(1)),
      count: scores.length,
    };
  });

  const candidateStats = candidates.map((candidate) => {
    const judgeScores = validJudges
      .map((judge) => getJudgeScore(candidate, judge, audition))
      .filter((score): score is number => score !== null);

    if (judgeScores.length < 2) {
      return { id: candidate.id, name: candidate.name, std: 0, spread: 0 };
    }

    const average = judgeScores.reduce((sum, score) => sum + score, 0) / judgeScores.length;
    const std = Math.sqrt(judgeScores.reduce((sum, score) => sum + (score - average) ** 2, 0) / judgeScores.length);
    const spread = Math.max(...judgeScores) - Math.min(...judgeScores);

    return {
      id: candidate.id,
      name: candidate.name,
      std: Number(std.toFixed(2)),
      spread,
    };
  });

  return {
    judgeStats,
    candidateStats,
  };
};
