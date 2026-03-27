export type JudgeName = "준모" | "정현" | "진하";

export interface Candidate {
  id: string;
  name: string;
  scores: Record<JudgeName, number | null>;
  total: number;
  average: number;
  updatedAt: any;
}

export const JUDGES: JudgeName[] = ["준모", "정현", "진하"];
