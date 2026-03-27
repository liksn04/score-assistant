import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Candidate, JudgeName, EvaluationItem } from '../types';
import { JUDGES, EVALUATION_ITEMS, SIMPLE_JUDGES } from '../types';

/**
 * 전제 심사위원 점수를 기반으로 총점과 평균을 계산하는 내부 유틸리티
 */
const calculateTotalAndAverage = (scores: Record<string, any>) => {
  let overallTotal = 0;
  let judgeCount = 0;

  JUDGES.forEach(j => {
    const jScores = scores[j];
    if (!jScores) return;

    let jTotal = 0;
    let hasScore = false;

    if (SIMPLE_JUDGES.includes(j)) {
      if (jScores.simpleTotal !== null && jScores.simpleTotal !== undefined) {
        jTotal = jScores.simpleTotal;
        hasScore = true;
      }
    } else {
      const validValues = EVALUATION_ITEMS.map(item => jScores[item]).filter((v): v is number => v !== null);
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
  // 참가자 추가
  async addCandidate(name: string, song: string) {
    const initialScores: any = {};
    JUDGES.forEach(j => {
      initialScores[j] = { strikes: 0, itemStrikes: {} };
      EVALUATION_ITEMS.forEach(item => {
        initialScores[j][item] = null;
        initialScores[j].itemStrikes[item] = 0;
      });
    });

    return await addDoc(collection(db, 'candidates'), {
      name,
      song,
      scores: initialScores,
      total: 0,
      average: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  // 구체적인 점수 업데이트 (세부 항목)
  async updateDetailScore(candidate: Candidate, judge: JudgeName, item: EvaluationItem, score: number | null) {
    const updatedJudgeScores = { 
      ...candidate.scores[judge], 
      [item]: score 
    };
    
    const newScores = {
      ...candidate.scores,
      [judge]: updatedJudgeScores
    };

    const { total, average } = calculateTotalAndAverage(newScores);

    return await updateDoc(doc(db, 'candidates', candidate.id), {
      scores: newScores,
      total,
      average,
      updatedAt: serverTimestamp()
    });
  },

  // 단순 점수 업데이트 (100점 만점)
  async updateSimpleScore(candidate: Candidate, judge: JudgeName, score: number | null) {
    const newScores = {
      ...candidate.scores,
      [judge]: { 
        ...candidate.scores[judge], 
        simpleTotal: score 
      }
    };

    const { total, average } = calculateTotalAndAverage(newScores);

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
  async updateItemStrikes(candidate: Candidate, judge: JudgeName, item: string, newVal: number) {
    const currentItemStrikes = candidate.scores[judge]?.itemStrikes || {};
    const newScores = {
      ...candidate.scores,
      [judge]: {
        ...candidate.scores[judge],
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
  async addComment(candidateId: string, judge: JudgeName, content: string) {
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      author: judge,
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
  async toggleJudgeCompletion(candidateId: string, judge: JudgeName, currentStatus: boolean) {
    return await updateDoc(doc(db, 'candidates', candidateId), {
      [`scores.${judge}.isCompleted`]: !currentStatus,
      updatedAt: serverTimestamp()
    });
  }
};
