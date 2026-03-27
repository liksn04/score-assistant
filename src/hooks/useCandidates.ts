import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Candidate } from '../types';

export const useCandidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 실시간 순위 데이터 (메모이제이션)
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      if (b.average !== a.average) return b.average - a.average;
      return a.name.localeCompare(b.name);
    });
  }, [candidates]);

  // 실시간 데이터 수신 및 정렬 고정
  useEffect(() => {
    const q = query(collection(db, 'candidates'));
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
  }, []);

  return { candidates, sortedCandidates, isLoading };
};
