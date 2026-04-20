import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { TrashBatch } from '../types';
import { mapTrashBatchRecord } from '../utils/auditionModel.ts';

export const useTrashBatches = () => {
  const [trashBatches, setTrashBatches] = useState<TrashBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'trashBatches'),
      (snapshot) => {
        setTrashBatches(
          snapshot.docs
            .map((batch) => mapTrashBatchRecord(batch.id, batch.data()))
            .filter((batch) => batch.status === 'active')
            .sort((left, right) => String(right.deletedAt ?? '').localeCompare(String(left.deletedAt ?? ''))),
        );
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return {
    trashBatches,
    isLoading,
  };
};
