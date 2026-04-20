export interface Criterion {
  item: string;
  maxScore: number;
}

export type JudgeType = 'detail' | 'simple' | 'observer';

export interface JudgeConfig {
  name: string;
  pin: string;
  type: JudgeType;
  criteria?: Criterion[];
}

export type EvaluationScores = Record<string, any> & {
  simpleTotal?: number | null;
  strikes?: number;
  itemStrikes?: Record<string, number>;
  isCompleted?: boolean;
};

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: any;
}

export interface Audition {
  id: string;
  name: string;
  status: 'active' | 'archived';
  activeJudges?: string[]; // 리더보드에 반영할 활성 심사위원 목록
  judges: JudgeConfig[];   // 동적 심사위원 설정
  dropCount: number;       // 하위 N팀 탈락 기준
  adminPin: string;        // 관리자 패널 접근용 PIN
  createdAt: any;
  updatedAt: any;
}

export interface Candidate {
  id: string;
  auditionId?: string;
  name: string;
  song?: string;
  scores: Record<string, EvaluationScores>;
  comments?: Comment[];
  total: number;
  average: number;
  createdAt?: any;
  updatedAt: any;
}

