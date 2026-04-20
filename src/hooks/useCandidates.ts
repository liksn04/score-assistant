import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Candidate, Audition } from '../types';
import { mapCandidateRecord } from '../utils/auditionModel.ts';
import { rankCandidates } from '../utils/rankingUtils.ts';

export const useCandidates = (audition: Audition | null) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sortedCandidates = useMemo(() => {
    if (!audition) {
      return [];
    }

    return rankCandidates(candidates, audition);
  }, [candidates, audition]);

  useEffect(() => {
    if (!audition?.id) {
      return;
    }

    const candidatesQuery = query(collection(db, 'candidates'), where('auditionId', '==', audition.id));
    const unsubscribe = onSnapshot(
      candidatesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((candidateSnapshot) => mapCandidateRecord(candidateSnapshot.id, candidateSnapshot.data()));
        const fixedData = [...data].sort((left, right) => {
          const leftTime =
            typeof left.createdAt === 'object' && left.createdAt !== null && 'seconds' in left.createdAt
              ? left.createdAt.seconds ?? 0
              : 0;
          const rightTime =
            typeof right.createdAt === 'object' && right.createdAt !== null && 'seconds' in right.createdAt
              ? right.createdAt.seconds ?? 0
              : 0;

          if (leftTime !== rightTime) {
            return leftTime - rightTime;
          }

          return left.id.localeCompare(right.id);
        });

        setCandidates(fixedData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Firestore 실시간 연결 오류:', error);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [audition?.id]);

  return {
    candidates: audition?.id ? candidates : [],
    sortedCandidates,
    isLoading: audition?.id ? isLoading : false,
  };
};
