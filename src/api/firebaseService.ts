import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocs,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Candidate, Audition, JudgeConfig } from '../types';
import { ADMIN_PIN } from '../constants/admin';

const FIRESTORE_DELETE_BATCH_SIZE = 450;

const chunkArray = <T,>(items: T[], chunkSize: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
};

/**
 * 전체 심사위원 점수를 기반으로 총점과 평균을 계산하는 내부 유틸리티
 */
const calculateTotalAndAverage = (scores: Record<string, any>, audition: Audition) => {
  let overallTotal = 0;
  let judgeCount = 0;

  // activeJudges에 포함된 심사위원만 합산 (없으면 모두 합산)
  const judgesToCount = audition.activeJudges && audition.activeJudges.length > 0 
    ? audition.activeJudges 
    : audition.judges.map(j => j.name);

  judgesToCount.forEach(judgeName => {
    const judgeConfig = audition.judges.find(j => j.name === judgeName);
    if (!judgeConfig || judgeConfig.type === 'observer') return;

    const jScores = scores[judgeName];
    if (!jScores) return;

    let jTotal = 0;
    let hasScore = false;

    if (judgeConfig.type === 'simple') {
      if (jScores.simpleTotal !== null && jScores.simpleTotal !== undefined) {
        jTotal = jScores.simpleTotal;
        hasScore = true;
      }
    } else if (judgeConfig.type === 'detail') {
      const items = judgeConfig.criteria?.map(c => c.item) || [];
      const validValues = items.map(item => jScores[item]).filter((v): v is number => v !== null && v !== undefined);
      if (validValues.length > 0) {
        jTotal = validValues.reduce((a, b) => a + b, 0);
        hasScore = true;
      }
    }

    if (hasScore) {
      overallTotal += jTotal;
      judgeCount++;
    }
  });

  const average = judgeCount > 0 ? Number((overallTotal / judgeCount).toFixed(2)) : 0;
  return { total: overallTotal, average };
};

export const firebaseService = {
  // 오디션 관리
  async createAudition(name: string) {
    return await addDoc(collection(db, 'auditions'), {
      name,
      status: 'active',
      activeJudges: [],
      judges: [],
      dropCount: 0,
      adminPin: ADMIN_PIN,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  async updateAuditionStatus(id: string, status: 'active' | 'archived') {
    return await updateDoc(doc(db, 'auditions', id), {
      status,
      updatedAt: serverTimestamp()
    });
  },

  async updateAuditionName(id: string, name: string) {
    return await updateDoc(doc(db, 'auditions', id), {
      name,
      updatedAt: serverTimestamp()
    });
  },

  async updateActiveJudges(id: string, activeJudges: string[]) {
    return await updateDoc(doc(db, 'auditions', id), {
      activeJudges,
      updatedAt: serverTimestamp()
    });
  },

  async updateAuditionSettings(id: string, judges: JudgeConfig[], dropCount: number) {
    const sanitizedJudges = judges.map((judge) => {
      const baseJudge = {
        name: judge.name.trim(),
        pin: judge.pin.trim(),
        type: judge.type,
      };

      if (judge.type !== 'detail') {
        return baseJudge;
      }

      return {
        ...baseJudge,
        criteria: (judge.criteria ?? []).map((criterion) => ({
          item: criterion.item.trim(),
          maxScore: Number(criterion.maxScore) || 0,
        })),
      };
    });

    return await updateDoc(doc(db, 'auditions', id), {
      judges: sanitizedJudges,
      dropCount,
      updatedAt: serverTimestamp()
    });
  },

  async deleteAudition(id: string) {
    if (!id.trim()) {
      throw new Error('삭제할 오디션 ID가 유효하지 않습니다.');
    }

    const auditionRef = doc(db, 'auditions', id);
    const candidateSnapshot = await getDocs(
      query(collection(db, 'candidates'), where('auditionId', '==', id))
    );
    const refsToDelete = [...candidateSnapshot.docs.map((candidateDoc) => candidateDoc.ref), auditionRef];

    // Edge case: 참가자 수가 많아도 Firestore 배치 한도를 넘지 않도록 나눠서 삭제합니다.
    // Edge case: 중간 실패 시 오디션 문서가 먼저 사라져 고아 참가자가 남지 않도록 오디션은 마지막 chunk에 포함됩니다.
    for (const refChunk of chunkArray(refsToDelete, FIRESTORE_DELETE_BATCH_SIZE)) {
      const batch = writeBatch(db);

      refChunk.forEach((ref) => {
        batch.delete(ref);
      });

      await batch.commit();
    }
  },

  // 참가자 추가
  async addCandidate(name: string, song: string, audition: Audition) {
    const initialScores: any = {};
    audition.judges.forEach(j => {
      initialScores[j.name] = { strikes: 0, itemStrikes: {} };
      if (j.type === 'detail' && j.criteria) {
        j.criteria.forEach(c => {
          initialScores[j.name][c.item] = null;
          initialScores[j.name].itemStrikes[c.item] = 0;
        });
      } else if (j.type === 'simple') {
        initialScores[j.name].simpleTotal = null;
      }
    });

    return await addDoc(collection(db, 'candidates'), {
      name,
      song,
      auditionId: audition.id,
      scores: initialScores,
      total: 0,
      average: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  // 구체적인 점수 업데이트 (세부 항목)
  async updateDetailScore(candidate: Candidate, judgeName: string, item: string, score: number | null, audition: Audition) {
    const updatedJudgeScores = { 
      ...candidate.scores[judgeName], 
      [item]: score 
    };
    
    const newScores = {
      ...candidate.scores,
      [judgeName]: updatedJudgeScores
    };

    const { total, average } = calculateTotalAndAverage(newScores, audition);

    return await updateDoc(doc(db, 'candidates', candidate.id), {
      scores: newScores,
      total,
      average,
      updatedAt: serverTimestamp()
    });
  },

  // 단순 점수 업데이트 (100점 만점)
  async updateSimpleScore(candidate: Candidate, judgeName: string, score: number | null, audition: Audition) {
    const newScores = {
      ...candidate.scores,
      [judgeName]: { 
        ...candidate.scores[judgeName], 
        simpleTotal: score 
      }
    };

    const { total, average } = calculateTotalAndAverage(newScores, audition);

    return await updateDoc(doc(db, 'candidates', candidate.id), {
      scores: newScores,
      total,
      average,
      updatedAt: serverTimestamp()
    });
  },

  // 참가자 삭제
  async deleteCandidate(id: string) {
    return await deleteDoc(doc(db, 'candidates', id));
  },

  // 곡명 업데이트
  async updateSongTitle(id: string, song: string) {
    return await updateDoc(doc(db, 'candidates', id), {
      song,
      updatedAt: serverTimestamp()
    });
  },

  // 스트라이크(X) 업데이트
  async updateItemStrikes(candidate: Candidate, judgeName: string, item: string, newVal: number) {
    const currentItemStrikes = candidate.scores[judgeName]?.itemStrikes || {};
    const newScores = {
      ...candidate.scores,
      [judgeName]: {
        ...candidate.scores[judgeName],
        itemStrikes: {
          ...currentItemStrikes,
          [item]: newVal
        }
      }
    };

    return await updateDoc(doc(db, 'candidates', candidate.id), {
      scores: newScores
    });
  },

  // 코멘트 추가
  async addComment(candidateId: string, judgeName: string, content: string) {
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      author: judgeName,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    return await updateDoc(doc(db, 'candidates', candidateId), {
      comments: arrayUnion(newComment)
    });
  },

  // 코멘트 삭제
  async deleteComment(candidateId: string, comment: any) {
    return await updateDoc(doc(db, 'candidates', candidateId), {
      comments: arrayRemove(comment),
      updatedAt: serverTimestamp()
    });
  },

  // 심사 완료 상태 토글
  async toggleJudgeCompletion(candidateId: string, judgeName: string, currentStatus: boolean) {
    return await updateDoc(doc(db, 'candidates', candidateId), {
      [`scores.${judgeName}.isCompleted`]: !currentStatus,
      updatedAt: serverTimestamp()
    });
  }
};
