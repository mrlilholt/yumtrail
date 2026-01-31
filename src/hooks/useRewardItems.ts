import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RewardItem } from '../types';

export const useRewardItems = (familyId?: string | null) => {
  const [items, setItems] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const itemsQuery = query(collection(db, 'rewardItems'), where('familyId', '==', familyId));

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<RewardItem, 'id'>)
        }));
        data.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
        setItems(data);
        setLoading(false);
      },
      () => {
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  return { items, loading };
};
