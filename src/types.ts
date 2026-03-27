export type JudgeName = "준모" | "정현" | "진하";

export const EVALUATION_ITEMS = ["박자", "음정", "가사", "긴장", "즐김"] as const;
export type EvaluationItem = typeof EVALUATION_ITEMS[number];

export type EvaluationScores = Record<EvaluationItem, number | null>;

// 심사위원별 세부 항목 배점 한도 (100점 만점 기준 배분)
export const JUDGE_SCORE_LIMITS: Record<JudgeName, Record<EvaluationItem, number>> = {
  "준모": { "박자": 20, "음정": 20, "가사": 20, "긴장": 20, "즐김": 20 },
  "정현": { "박자": 20, "음정": 20, "가사": 20, "긴장": 20, "즐김": 20 },
  "진하": { "박자": 30, "음정": 30, "가사": 10, "긴장": 15, "즐김": 15 }
};

export interface Candidate {
  id: string;
  name: string;
  // 심사위원별 세부 점수 저장
  scores: Record<JudgeName, EvaluationScores>;
  total: number;
  average: number;
  updatedAt: any;
}

export const JUDGES: JudgeName[] = ["준모", "정현", "진하"];
