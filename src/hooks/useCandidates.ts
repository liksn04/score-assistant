import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Candidate, JudgeName } from '../types';
import { getJudgeScore } from '../utils/statsUtils';

export const useCandidates = (auditionId: string | null, activeJudges: JudgeName[] = []) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 실시간 순위 데이터 (메모이제이션)
  // 실시간 순위 데이터 (메모이제이션 - 활성 심사위원이 바뀔 때마다 재계산)
  const sortedCandidates = useMemo(() => {
    return [...candidates].map(c => {
      let total = 0;
      let count = 0;
      
      activeJudges.forEach(j => {
        const score = getJudgeScore(c, j);
        if (score !== null) {
          total += score;
          count++;
        }
      });

      const average = count > 0 ? Number((total / count).toFixed(2)) : 0;
      
      return {
        ...c,
        total, // 화면 표시용으로 덮어씀
        average // 화면 표시용으로 덮어씀
      };
    }).sort((a, b) => {
      if (b.average !== a.average) return b.average - a.average;
      return a.name.localeCompare(b.name);
    });
  }, [candidates, activeJudges]);

  // 실시간 데이터 수신 및 정렬 고정
  useEffect(() => {
    if (!auditionId) {
      setCandidates([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'candidates'),
      where('auditionId', '==', auditionId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Candidate[];
      
      // 입력창 고정을 위해 등록 순으로 정렬 (createdAt 기준 오름차순, 없으면 id 기준)
      const fixedData = [...data].sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });
      
      setCandidates(fixedData);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore 실시간 연결 오류:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auditionId]);

  return { candidates, sortedCandidates, isLoading };
};
