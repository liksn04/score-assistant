export type TimestampLike =
  | string
  | number
  | Date
  | {
      seconds?: number;
      nanoseconds?: number;
      toDate?: () => Date;
    }
  | null
  | undefined;

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

export type EvaluationScores = Record<string, unknown> & {
  simpleTotal?: number | null;
  strikes?: number;
  itemStrikes?: Record<string, number>;
  isCompleted?: boolean;
};

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: TimestampLike;
}

export type RankingCriterion = 'average' | 'total' | 'name';

export interface RankingPolicy {
  id: string;
  label: string;
  criteria: RankingCriterion[];
}

export interface RankingSnapshotEntry {
  candidateId: string;
  candidateName: string;
  song: string;
  rank: number;
  total: number;
  average: number;
  completedJudgeCount: number;
  expectedJudgeCount: number;
  isFullyCompleted: boolean;
  judgeTotals: Record<string, number>;
}

export interface RankingSnapshot {
  id: string;
  generatedAt: TimestampLike;
  policyId: string;
  candidateCount: number;
  entries: RankingSnapshotEntry[];
}

export interface FinalizationState {
  isFinalized: boolean;
  finalizedAt: TimestampLike | null;
  lastSnapshot: RankingSnapshot | null;
  reopenCount: number;
  reopenedAt: TimestampLike | null;
}

export interface CandidateUnlock {
  candidateId: string;
  candidateName: string;
  unlockedAt: TimestampLike;
  unlockedBy: string;
}

export interface Audition {
  id: string;
  name: string;
  status: 'active' | 'archived';
  activeJudges?: string[];
  judges: JudgeConfig[];
  dropCount: number;
  adminPin: string;
  rankingPolicy: RankingPolicy;
  finalization: FinalizationState;
  unlocks: CandidateUnlock[];
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
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
  createdAt?: TimestampLike;
  updatedAt: TimestampLike;
}

export interface AdminLogEntry {
  id: string;
  auditionId: string;
  auditionName: string;
  actor: string;
  action:
    | 'audition-created'
    | 'audition-renamed'
    | 'audition-settings-updated'
    | 'audition-finalized'
    | 'audition-reopened'
    | 'candidate-unlocked'
    | 'audition-moved-to-trash'
    | 'trash-restored'
    | 'trash-purged'
    | 'bulk-import-completed';
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: TimestampLike;
}

export interface TrashBatch {
  id: string;
  auditionId: string;
  auditionName: string;
  candidateCount: number;
  candidatePreview: string[];
  deletedAt: TimestampLike;
  expiresAt: TimestampLike;
  deletedBy: string;
  status: 'active' | 'restored' | 'purged';
  restoredAt?: TimestampLike | null;
  purgedAt?: TimestampLike | null;
  auditionSnapshot: Omit<Audition, 'id'> & { id: string };
}

export interface TrashCandidateSnapshot extends Candidate {
  trashBatchId: string;
  originalCandidateId: string;
}

export interface BulkImportRow {
  rowNumber: number;
  teamName: string;
  song: string;
  normalizedName: string;
  status: 'ready' | 'error';
  errors: string[];
}

export interface BulkImportIssue {
  rowNumber: number;
  code:
    | 'invalid-columns'
    | 'empty-team-name'
    | 'empty-song-title'
    | 'duplicate-team-name'
    | 'duplicate-existing-team-name';
  message: string;
}

export interface BulkImportValidationResult {
  rows: BulkImportRow[];
  validRows: BulkImportRow[];
  errors: BulkImportIssue[];
  hasBlockingErrors: boolean;
}

export type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastPayload {
  id?: string;
  kind: ToastKind;
  title: string;
  message?: string;
  durationMs?: number;
  dedupeKey?: string;
}

export interface ToastRecord extends ToastPayload {
  id: string;
  createdAt: number;
}

export interface ToastState {
  items: ToastRecord[];
}

export interface PendingMutationState {
  key: string | null;
  label: string | null;
}

export type AppView = 'landing' | 'judge' | 'admin' | 'observer-board' | 'report-print';

export type CandidateStatusFilter =
  | 'all'
  | 'incomplete'
  | 'complete'
  | 'in-progress'
  | 'unlocked';

export interface JudgeProgressItem {
  judgeName: string;
  completedCount: number;
  totalCount: number;
  completionRate: number;
  missingComments: number;
}

export interface CandidateProgressItem {
  candidateId: string;
  candidateName: string;
  completedJudgeCount: number;
  expectedJudgeCount: number;
  completionRate: number;
  missingScores: number;
  missingComments: number;
  isUnlocked: boolean;
}

export interface RankedCandidate extends Candidate {
  rank: number;
  total: number;
  average: number;
  completedJudgeCount: number;
  expectedJudgeCount: number;
  isFullyCompleted: boolean;
  judgeTotals: Record<string, number>;
  isUnlocked: boolean;
}

export interface ProgressSnapshot {
  judges: JudgeProgressItem[];
  candidates: CandidateProgressItem[];
  totals: {
    candidateCount: number;
    completedCandidates: number;
    inProgressCandidates: number;
    unlockedCandidates: number;
    missingScoreCount: number;
    missingCommentCount: number;
  };
}

export interface PrintReportSnapshot {
  auditionId: string;
  auditionName: string;
  finalizedAt: TimestampLike | null;
  policyLabel: string;
  rankings: RankingSnapshotEntry[];
  judges: JudgeConfig[];
  progress: ProgressSnapshot;
}
