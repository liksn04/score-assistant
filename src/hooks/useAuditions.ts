import { useEffect, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, orderBy, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ADMIN_PIN } from '../constants/admin';
import { firebaseService } from '../api/firebaseService';
import type { Audition } from '../types';
import { mapAuditionRecord } from '../utils/auditionModel.ts';

export const useAuditions = () => {
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [activeAuditionId, setActiveAuditionId] = useState<string | null>(localStorage.getItem('activeAuditionId'));
  const [isLoading, setIsLoading] = useState(true);

  const migrateLegacyCandidates = async (targetAuditionId: string) => {
    const orphanQuery = query(collection(db, 'candidates'), where('auditionId', '==', null));
    const orphanSnapshot = await getDocs(orphanQuery);

    if (!orphanSnapshot.empty) {
      const batch = writeBatch(db);
      orphanSnapshot.docs.forEach((snapshot) => {
        batch.update(doc(db, 'candidates', snapshot.id), { auditionId: targetAuditionId });
      });
      await batch.commit();
      return;
    }

    const allCandidates = await getDocs(collection(db, 'candidates'));
    const legacyCandidates = allCandidates.docs.filter((snapshot) => !snapshot.data().auditionId);

    if (legacyCandidates.length === 0) {
      return;
    }

    const batch = writeBatch(db);
    legacyCandidates.forEach((snapshot) => {
      batch.update(doc(db, 'candidates', snapshot.id), { auditionId: targetAuditionId });
    });
    await batch.commit();
  };

  useEffect(() => {
    const auditionsQuery = query(collection(db, 'auditions'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(auditionsQuery, async (snapshot) => {
      const data = snapshot.docs.map((auditionSnapshot) =>
        mapAuditionRecord(auditionSnapshot.id, auditionSnapshot.data(), ADMIN_PIN),
      );

      setAuditions(data);

      if (data.length === 0 && !isLoading) {
        const newAudition = await firebaseService.createAudition('기본 오디션');
        setActiveAuditionId(newAudition.id);
        await migrateLegacyCandidates(newAudition.id);
      } else if (data.length > 0) {
        const hasActiveAudition = activeAuditionId
          ? data.some((audition) => audition.id === activeAuditionId)
          : false;

        if (!hasActiveAudition) {
          setActiveAuditionId(data[0].id);
        }
      } else if (activeAuditionId) {
        setActiveAuditionId(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeAuditionId, isLoading]);

  useEffect(() => {
    if (activeAuditionId) {
      localStorage.setItem('activeAuditionId', activeAuditionId);
      return;
    }

    localStorage.removeItem('activeAuditionId');
  }, [activeAuditionId]);

  return {
    auditions,
    activeAuditionId,
    setActiveAuditionId,
    isLoading,
  };
};
