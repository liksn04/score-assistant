import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, getDocs, where, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { firebaseService } from '../api/firebaseService';
import type { Audition } from '../types';

export const useAuditions = () => {
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [activeAuditionId, setActiveAuditionId] = useState<string | null>(
    localStorage.getItem('activeAuditionId')
  );
  const [isLoading, setIsLoading] = useState(true);

  // 마이그레이션 로직: auditionId가 없는 기존 참가자들을 첫 오디션에 할당
  const migrateLegacyCandidates = async (targetAuditionId: string) => {
    const q = query(collection(db, 'candidates'), where('auditionId', '==', null));
    const snapshot = await getDocs(q);
    
    // Firestore where('field', '==', null)은 필드가 아예 없는 경우를 찾지 못할 수 있음
    // 모든 데이터를 가져와서 필터링 (데이터 양이 적을 것으로 예상)
    if (snapshot.empty) {
      const allQ = query(collection(db, 'candidates'));
      const allSnap = await getDocs(allQ);
      const legacyDocs = allSnap.docs.filter(d => !d.data().auditionId);
      
      if (legacyDocs.length > 0) {
        const batch = writeBatch(db);
        legacyDocs.forEach(d => {
          batch.update(doc(db, 'candidates', d.id), { auditionId: targetAuditionId });
        });
        await batch.commit();
        console.log(`${legacyDocs.length}명의 기존 참가자를 오디션(${targetAuditionId})으로 이동했습니다.`);
      }
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'auditions'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          status: d.status || 'active',
          activeJudges: d.activeJudges || [],
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        };
      }) as Audition[];
      
      setAuditions(data);
      
      if (data.length === 0 && !isLoading) {
        const newAudition = await firebaseService.createAudition("기본 오디션");
        setActiveAuditionId(newAudition.id);
        await migrateLegacyCandidates(newAudition.id);
      } else if (!activeAuditionId && data.length > 0) {
        setActiveAuditionId(data[0].id);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeAuditionId, isLoading]);

  useEffect(() => {
    if (activeAuditionId) {
      localStorage.setItem('activeAuditionId', activeAuditionId);
    }
  }, [activeAuditionId]);

  return { 
    auditions, 
    activeAuditionId, 
    setActiveAuditionId, 
    isLoading 
  };
};
