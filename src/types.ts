export type JudgeName = "준모" | "정현" | "진하" | "참관자";

export const EVALUATION_ITEMS = ["박자", "음정", "가사", "긴장", "즐김"] as const;
export type EvaluationItem = typeof EVALUATION_ITEMS[number];

// EvaluationScores can hold detailed items or a single simple score
// To maintain compatibility, we'll store the simple score in a field named 'total'
export type EvaluationScores = Record<EvaluationItem, number | null> & {
  simpleTotal?: number | null;
  strikes?: number; // 전체 스트라이크 (하위 호환성 유지)
  itemStrikes?: Record<string, number>; // 항목별 스트라이크
};

// 단순 채점 방식을 사용하는 심사위원 명단
export const SIMPLE_JUDGES: JudgeName[] = ["정현", "참관자"];

// 심사위원별 세부 항목 배점 한도 (100점 만점 기준 배분)
export const JUDGE_SCORE_LIMITS: Record<JudgeName, Record<EvaluationItem, number>> = {
  "준모": { "박자": 20, "음정": 20, "가사": 20, "긴장": 20, "즐김": 20 },
  "정현": { "박자": 20, "음정": 20, "가사": 20, "긴장": 20, "즐김": 20 },
  "진하": { "박자": 30, "음정": 30, "가사": 10, "긴장": 15, "즐김": 15 },
  "참관자": { "박자": 0, "음정": 0, "가사": 0, "긴장": 0, "즐김": 0 }
};

export interface Comment {
  id: string;
  author: JudgeName;
  content: string;
  createdAt: any;
}

export interface Candidate {
  id: string;
  name: string;
  song?: string;
  // 심사위원별 점수 저장
  scores: Record<JudgeName, EvaluationScores>;
  comments?: Comment[]; // 선택적 필드로 추가 (기존 데이터 호환성)
  total: number;
  average: number;
  updatedAt: any;
}

export const JUDGES: JudgeName[] = ["준모", "정현", "진하", "참관자"];
