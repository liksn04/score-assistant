import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Candidate, Audition } from '../types';
import { getJudgeScore } from '../utils/statsUtils';

export const useCandidates = (audition: Audition | null) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 실시간 순위 데이터 (메모이제이션)
  const sortedCandidates = useMemo(() => {
    if (!audition) return [];
    const activeJudges = audition.activeJudges || [];
    
    return [...candidates].map(c => {
      let total = 0;
      let count = 0;
      
      activeJudges.forEach(j => {
        const score = getJudgeScore(c, j, audition);
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
  }, [candidates, audition]);

  useEffect(() => {
    if (!audition?.id) {
      setCandidates([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'candidates'),
      where('auditionId', '==', audition.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Candidate[];
      
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
  }, [audition?.id]);

  return { candidates, sortedCandidates, isLoading };
};
