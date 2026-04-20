import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { AdminLogEntry } from '../types';

export const useAdminLogs = (auditionId: string | null) => {
  const [allLogs, setAllLogs] = useState<AdminLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auditionId) {
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'adminLogs'),
      (snapshot) => {
        setAllLogs(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<AdminLogEntry, 'id'>) })));
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [auditionId]);

  const logs = auditionId
    ? allLogs
        .filter((entry) => entry.auditionId === auditionId)
        .sort((left, right) => String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')))
    : [];

  return {
    logs,
    isLoading: auditionId ? isLoading : false,
  };
};
