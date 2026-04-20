import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type {
  AdminLogEntry,
  Audition,
  BulkImportRow,
  Candidate,
  Comment,
  JudgeConfig,
  RankingPolicy,
  TrashBatch,
  TrashCandidateSnapshot,
} from '../types';
import { ADMIN_PIN } from '../constants/admin';
import { buildInitialCandidateScores, createDefaultAuditionPayload, sanitizeJudgeConfigs } from '../utils/auditionModel.ts';
import {
  buildPrintReportSnapshot as buildPrintReportSnapshotUtil,
  canEditCandidateScore,
  createRankingSnapshot,
  getScoringJudges,
  normalizeRankingPolicy,
} from '../utils/rankingUtils.ts';

const FIRESTORE_BATCH_LIMIT = 450;
const TRASH_RETENTION_DAYS = 30;

const AUDITIONS_COLLECTION = 'auditions';
const CANDIDATES_COLLECTION = 'candidates';
const ADMIN_LOGS_COLLECTION = 'adminLogs';
const TRASH_BATCHES_COLLECTION = 'trashBatches';
const TRASH_CANDIDATES_SUBCOLLECTION = 'candidateSnapshots';

const createClientTimestamp = () => new Date().toISOString();

const chunkArray = <T,>(items: T[], chunkSize: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
};

const createCommentId = () =>
  globalThis.crypto?.randomUUID?.() ?? `comment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const calculateTotalAndAverage = (scores: Candidate['scores'], audition: Audition) => {
  let overallTotal = 0;
  let judgeCount = 0;

  getScoringJudges(audition).forEach((judgeName) => {
    const judgeConfig = audition.judges.find((judge) => judge.name === judgeName);
    const judgeScores = scores[judgeName];

    if (!judgeConfig || !judgeScores) {
      return;
    }

    let judgeTotal = 0;
    let hasScore = false;

    if (judgeConfig.type === 'simple') {
      if (typeof judgeScores.simpleTotal === 'number') {
        judgeTotal = judgeScores.simpleTotal;
        hasScore = true;
      }
    }

    if (judgeConfig.type === 'detail') {
      const criteria = judgeConfig.criteria ?? [];
      const values = criteria
        .map((criterion) => judgeScores[criterion.item])
        .filter((value): value is number => typeof value === 'number');

      if (values.length > 0) {
        judgeTotal = values.reduce((sum, value) => sum + value, 0);
        hasScore = true;
      }
    }

    if (hasScore) {
      overallTotal += judgeTotal;
      judgeCount += 1;
    }
  });

  return {
    total: overallTotal,
    average: judgeCount > 0 ? Number((overallTotal / judgeCount).toFixed(2)) : 0,
  };
};

const deleteAuditionRecords = async (auditionId: string) => {
  const auditionRef = doc(db, AUDITIONS_COLLECTION, auditionId);
  const candidateSnapshot = await getDocs(query(collection(db, CANDIDATES_COLLECTION), where('auditionId', '==', auditionId)));
  const refsToDelete = [...candidateSnapshot.docs.map((candidateDoc) => candidateDoc.ref), auditionRef];

  for (const refChunk of chunkArray(refsToDelete, FIRESTORE_BATCH_LIMIT)) {
    const batch = writeBatch(db);
    refChunk.forEach((ref) => {
      batch.delete(ref);
    });
    await batch.commit();
  }
};

const ensureCandidateEditable = (audition: Audition, candidateId: string) => {
  if (!canEditCandidateScore(audition, candidateId)) {
    throw new Error('확정된 결과는 잠금 해제된 팀만 수정할 수 있습니다.');
  }
};

const createAdminLogInput = (
  entry: Omit<AdminLogEntry, 'id' | 'createdAt'> & { createdAt?: string },
) => ({
  ...entry,
  createdAt: entry.createdAt ?? createClientTimestamp(),
});

export const firebaseService = {
  async writeAdminLog(entry: Omit<AdminLogEntry, 'id' | 'createdAt'> & { createdAt?: string }) {
    await addDoc(collection(db, ADMIN_LOGS_COLLECTION), createAdminLogInput(entry));
  },

  async createAudition(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('오디션 이름은 비워둘 수 없습니다.');
    }

    const auditionRef = await addDoc(collection(db, AUDITIONS_COLLECTION), {
      ...createDefaultAuditionPayload(trimmedName, ADMIN_PIN),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await this.writeAdminLog({
      action: 'audition-created',
      actor: 'ADMIN',
      auditionId: auditionRef.id,
      auditionName: trimmedName,
      message: '새 오디션을 생성했습니다.',
    });

    return auditionRef;
  },

  async updateAuditionStatus(id: string, status: 'active' | 'archived') {
    await updateDoc(doc(db, AUDITIONS_COLLECTION, id), {
      status,
      updatedAt: serverTimestamp(),
    });
  },

  async updateAuditionName(id: string, currentName: string, nextName: string) {
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      throw new Error('오디션 이름은 비워둘 수 없습니다.');
    }

    await updateDoc(doc(db, AUDITIONS_COLLECTION, id), {
      name: trimmedName,
      updatedAt: serverTimestamp(),
    });

    await this.writeAdminLog({
      action: 'audition-renamed',
      actor: 'ADMIN',
      auditionId: id,
      auditionName: trimmedName,
      message: `오디션 이름을 "${currentName}"에서 "${trimmedName}"으로 변경했습니다.`,
    });
  },

  async updateActiveJudges(id: string, activeJudges: string[]) {
    await updateDoc(doc(db, AUDITIONS_COLLECTION, id), {
      activeJudges,
      updatedAt: serverTimestamp(),
    });
  },

  async updateAuditionSettings(id: string, auditionName: string, judges: JudgeConfig[], dropCount: number, rankingPolicy: RankingPolicy) {
    await updateDoc(doc(db, AUDITIONS_COLLECTION, id), {
      judges: sanitizeJudgeConfigs(judges),
      dropCount,
      rankingPolicy: normalizeRankingPolicy(rankingPolicy),
      updatedAt: serverTimestamp(),
    });

    await this.writeAdminLog({
      action: 'audition-settings-updated',
      actor: 'ADMIN',
      auditionId: id,
      auditionName,
      message: '오디션 운영 설정을 저장했습니다.',
      metadata: {
        judgeCount: judges.length,
        dropCount,
        rankingPolicy: rankingPolicy.id,
      },
    });
  },

  async finalizeAudition(audition: Audition, candidates: Candidate[]) {
    const finalizedAt = createClientTimestamp();
    const snapshot = createRankingSnapshot(audition, candidates, finalizedAt);

    await updateDoc(doc(db, AUDITIONS_COLLECTION, audition.id), {
      rankingPolicy: normalizeRankingPolicy(audition.rankingPolicy),
      finalization: {
        ...audition.finalization,
        isFinalized: true,
        finalizedAt,
        lastSnapshot: snapshot,
      },
      unlocks: [],
      updatedAt: serverTimestamp(),
    });

    await this.writeAdminLog({
      action: 'audition-finalized',
      actor: 'ADMIN',
      auditionId: audition.id,
      auditionName: audition.name,
      message: '오디션 결과를 확정했습니다.',
      metadata: {
        candidateCount: snapshot.candidateCount,
        policyId: snapshot.policyId,
      },
    });
  },

  async reopenAudition(audition: Audition) {
    const reopenedAt = createClientTimestamp();

    await updateDoc(doc(db, AUDITIONS_COLLECTION, audition.id), {
      finalization: {
        ...audition.finalization,
        isFinalized: false,
        reopenedAt,
        reopenCount: audition.finalization.reopenCount + 1,
      },
      unlocks: [],
      updatedAt: serverTimestamp(),
    });

    await this.writeAdminLog({
      action: 'audition-reopened',
      actor: 'ADMIN',
      auditionId: audition.id,
      auditionName: audition.name,
      message: '오디션 전체를 재개방했습니다.',
    });
  },

  async unlockCandidate(audition: Audition, candidate: Candidate) {
    if (!audition.finalization.isFinalized) {
      throw new Error('확정된 오디션에서만 팀 잠금 해제를 사용할 수 있습니다.');
    }

    const unlockExists = audition.unlocks.some((unlock) => unlock.candidateId === candidate.id);
    if (unlockExists) {
      return;
    }

    const nextUnlocks = [
      ...audition.unlocks,
      {
        candidateId: candidate.id,
        candidateName: candidate.name,
        unlockedAt: createClientTimestamp(),
        unlockedBy: 'ADMIN',
      },
    ];

    await updateDoc(doc(db, AUDITIONS_COLLECTION, audition.id), {
      unlocks: nextUnlocks,
      updatedAt: serverTimestamp(),
    });

    await this.writeAdminLog({
      action: 'candidate-unlocked',
      actor: 'ADMIN',
      auditionId: audition.id,
      auditionName: audition.name,
      message: `${candidate.name} 팀의 수정 잠금을 해제했습니다.`,
      metadata: {
        candidateId: candidate.id,
      },
    });
  },

  async moveAuditionToTrash(audition: Audition, candidates: Candidate[]) {
    if (!audition.id.trim()) {
      throw new Error('삭제할 오디션 ID가 유효하지 않습니다.');
    }

    const trashBatchRef = doc(collection(db, TRASH_BATCHES_COLLECTION));
    const deletedAt = createClientTimestamp();
    const expiresAt = new Date(Date.now() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const trashBatchPayload: Omit<TrashBatch, 'id'> = {
      auditionId: audition.id,
      auditionName: audition.name,
      candidateCount: candidates.length,
      candidatePreview: candidates.slice(0, 5).map((candidate) => candidate.name),
      deletedAt,
      expiresAt,
      deletedBy: 'ADMIN',
      status: 'active',
      auditionSnapshot: {
        ...audition,
      },
    };

    await setDoc(trashBatchRef, trashBatchPayload);

    for (const candidateChunk of chunkArray(candidates, FIRESTORE_BATCH_LIMIT)) {
      const batch = writeBatch(db);
      candidateChunk.forEach((candidate) => {
        const snapshotRef = doc(collection(db, TRASH_BATCHES_COLLECTION, trashBatchRef.id, TRASH_CANDIDATES_SUBCOLLECTION), candidate.id);
        const payload: TrashCandidateSnapshot = {
          ...candidate,
          trashBatchId: trashBatchRef.id,
          originalCandidateId: candidate.id,
        };
        batch.set(snapshotRef, payload);
      });
      await batch.commit();
    }

    await deleteAuditionRecords(audition.id);

    await this.writeAdminLog({
      action: 'audition-moved-to-trash',
      actor: 'ADMIN',
      auditionId: audition.id,
      auditionName: audition.name,
      message: '오디션을 휴지통으로 이동했습니다.',
      metadata: {
        trashBatchId: trashBatchRef.id,
        candidateCount: candidates.length,
      },
    });

    return trashBatchRef.id;
  },

  async restoreTrashBatch(batchId: string) {
    const trashBatchRef = doc(db, TRASH_BATCHES_COLLECTION, batchId);
    const trashBatchSnapshot = await getDoc(trashBatchRef);

    if (!trashBatchSnapshot.exists()) {
      throw new Error('복구할 휴지통 배치를 찾을 수 없습니다.');
    }

    const trashBatch = trashBatchSnapshot.data() as Omit<TrashBatch, 'id'>;
    if (trashBatch.status !== 'active') {
      throw new Error('이미 처리된 휴지통 배치입니다.');
    }

    const auditionSnapshot = trashBatch.auditionSnapshot;
    const restoredAt = createClientTimestamp();
    const { id: auditionId, ...auditionPayload } = auditionSnapshot;

    await setDoc(doc(db, AUDITIONS_COLLECTION, auditionId), {
      ...auditionPayload,
      updatedAt: restoredAt,
    });

    const candidateSnapshots = await getDocs(
      collection(db, TRASH_BATCHES_COLLECTION, batchId, TRASH_CANDIDATES_SUBCOLLECTION),
    );

    for (const snapshotChunk of chunkArray(candidateSnapshots.docs, FIRESTORE_BATCH_LIMIT)) {
      const batch = writeBatch(db);
      snapshotChunk.forEach((snapshotDoc) => {
        const payload = snapshotDoc.data() as TrashCandidateSnapshot;
        const restoredCandidate = {
          auditionId: payload.auditionId,
          name: payload.name,
          song: payload.song,
          scores: payload.scores,
          comments: payload.comments,
          total: payload.total,
          average: payload.average,
          createdAt: payload.createdAt,
        };
        batch.set(doc(db, CANDIDATES_COLLECTION, snapshotDoc.id), {
          ...restoredCandidate,
          updatedAt: restoredAt,
        });
      });
      await batch.commit();
    }

    await updateDoc(trashBatchRef, {
      status: 'restored',
      restoredAt,
    });

    await this.writeAdminLog({
      action: 'trash-restored',
      actor: 'ADMIN',
      auditionId: auditionId,
      auditionName: trashBatch.auditionName,
      message: '휴지통에서 오디션을 복구했습니다.',
      metadata: {
        trashBatchId: batchId,
      },
    });
  },

  async purgeTrashBatch(batchId: string) {
    const trashBatchRef = doc(db, TRASH_BATCHES_COLLECTION, batchId);
    const trashBatchSnapshot = await getDoc(trashBatchRef);

    if (!trashBatchSnapshot.exists()) {
      throw new Error('삭제할 휴지통 배치를 찾을 수 없습니다.');
    }

    const trashBatch = trashBatchSnapshot.data() as Omit<TrashBatch, 'id'>;
    const candidateSnapshots = await getDocs(
      collection(db, TRASH_BATCHES_COLLECTION, batchId, TRASH_CANDIDATES_SUBCOLLECTION),
    );

    for (const snapshotChunk of chunkArray(candidateSnapshots.docs, FIRESTORE_BATCH_LIMIT)) {
      const batch = writeBatch(db);
      snapshotChunk.forEach((snapshotDoc) => {
        batch.delete(snapshotDoc.ref);
      });
      await batch.commit();
    }

    await deleteDoc(trashBatchRef);

    await this.writeAdminLog({
      action: 'trash-purged',
      actor: 'ADMIN',
      auditionId: trashBatch.auditionId,
      auditionName: trashBatch.auditionName,
      message: '휴지통 배치를 영구 삭제했습니다.',
      metadata: {
        trashBatchId: batchId,
      },
    });
  },

  async bulkImportCandidates(audition: Audition, rows: BulkImportRow[]) {
    if (audition.finalization.isFinalized) {
      throw new Error('확정된 오디션에는 참가팀을 추가할 수 없습니다.');
    }

    const validRows = rows.filter((row) => row.status === 'ready');
    const candidatePayloads = validRows.map((row) => ({
      name: row.teamName,
      song: row.song,
      auditionId: audition.id,
      scores: buildInitialCandidateScores(audition),
      total: 0,
      average: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    for (const payloadChunk of chunkArray(candidatePayloads, FIRESTORE_BATCH_LIMIT)) {
      const batch = writeBatch(db);
      payloadChunk.forEach((payload) => {
        batch.set(doc(collection(db, CANDIDATES_COLLECTION)), payload);
      });
      await batch.commit();
    }

    await this.writeAdminLog({
      action: 'bulk-import-completed',
      actor: 'ADMIN',
      auditionId: audition.id,
      auditionName: audition.name,
      message: '참가팀 일괄 등록을 완료했습니다.',
      metadata: {
        importedCount: validRows.length,
      },
    });

    return {
      importedCount: validRows.length,
      rejectedCount: rows.length - validRows.length,
    };
  },

  async addCandidate(name: string, song: string, audition: Audition) {
    if (audition.finalization.isFinalized) {
      throw new Error('확정된 오디션에는 새 팀을 등록할 수 없습니다.');
    }

    return addDoc(collection(db, CANDIDATES_COLLECTION), {
      name: name.trim(),
      song: song.trim(),
      auditionId: audition.id,
      scores: buildInitialCandidateScores(audition),
      total: 0,
      average: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async updateDetailScore(candidate: Candidate, judgeName: string, item: string, score: number | null, audition: Audition) {
    ensureCandidateEditable(audition, candidate.id);

    const updatedJudgeScores = {
      ...candidate.scores[judgeName],
      [item]: score,
    };
    const newScores = {
      ...candidate.scores,
      [judgeName]: updatedJudgeScores,
    };
    const { total, average } = calculateTotalAndAverage(newScores, audition);

    await updateDoc(doc(db, CANDIDATES_COLLECTION, candidate.id), {
      scores: newScores,
      total,
      average,
      updatedAt: serverTimestamp(),
    });
  },

  async updateSimpleScore(candidate: Candidate, judgeName: string, score: number | null, audition: Audition) {
    ensureCandidateEditable(audition, candidate.id);

    const newScores = {
      ...candidate.scores,
      [judgeName]: {
        ...candidate.scores[judgeName],
        simpleTotal: score,
      },
    };
    const { total, average } = calculateTotalAndAverage(newScores, audition);

    await updateDoc(doc(db, CANDIDATES_COLLECTION, candidate.id), {
      scores: newScores,
      total,
      average,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteCandidate(candidate: Candidate, audition: Audition) {
    ensureCandidateEditable(audition, candidate.id);
    await deleteDoc(doc(db, CANDIDATES_COLLECTION, candidate.id));
  },

  async updateSongTitle(candidate: Candidate, song: string, audition: Audition) {
    ensureCandidateEditable(audition, candidate.id);
    await updateDoc(doc(db, CANDIDATES_COLLECTION, candidate.id), {
      song: song.trim(),
      updatedAt: serverTimestamp(),
    });
  },

  async updateItemStrikes(candidate: Candidate, judgeName: string, item: string, newVal: number, audition: Audition) {
    ensureCandidateEditable(audition, candidate.id);

    const currentItemStrikes = candidate.scores[judgeName]?.itemStrikes || {};
    const newScores = {
      ...candidate.scores,
      [judgeName]: {
        ...candidate.scores[judgeName],
        itemStrikes: {
          ...currentItemStrikes,
          [item]: newVal,
        },
      },
    };

    await updateDoc(doc(db, CANDIDATES_COLLECTION, candidate.id), {
      scores: newScores,
      updatedAt: serverTimestamp(),
    });
  },

  async addComment(candidate: Candidate, judgeName: string, content: string, audition: Audition) {
    ensureCandidateEditable(audition, candidate.id);

    const newComment: Comment = {
      id: createCommentId(),
      author: judgeName,
      content: content.trim(),
      createdAt: createClientTimestamp(),
    };

    await updateDoc(doc(db, CANDIDATES_COLLECTION, candidate.id), {
      comments: arrayUnion(newComment),
      updatedAt: serverTimestamp(),
    });
  },

  async deleteComment(candidate: Candidate, comment: Comment, audition: Audition) {
    ensureCandidateEditable(audition, candidate.id);

    await updateDoc(doc(db, CANDIDATES_COLLECTION, candidate.id), {
      comments: arrayRemove(comment),
      updatedAt: serverTimestamp(),
    });
  },

  async toggleJudgeCompletion(candidate: Candidate, judgeName: string, currentStatus: boolean, audition: Audition) {
    ensureCandidateEditable(audition, candidate.id);

    await updateDoc(doc(db, CANDIDATES_COLLECTION, candidate.id), {
      [`scores.${judgeName}.isCompleted`]: !currentStatus,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteAudition(id: string) {
    await deleteAuditionRecords(id);
  },

  async exportFinalWorkbook(audition: Audition, candidates: Candidate[]) {
    const { exportFinalWorkbook } = await import('../utils/exportUtils.ts');
    await exportFinalWorkbook(candidates, audition);
  },

  buildPrintReportSnapshot(audition: Audition, candidates: Candidate[]) {
    return buildPrintReportSnapshotUtil(audition, candidates);
  },
};
