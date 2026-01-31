import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Kid } from '../types';
import { DEFAULT_CARE_STATS } from '../lib/careStats';

export const useKids = (familyId?: string | null) => {
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setKids([]);
      setLoading(false);
      return;
    }

    const kidsQuery = query(collection(db, 'kids'), where('familyId', '==', familyId));

    const unsubscribe = onSnapshot(
      kidsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<Kid, 'id'>;
          const baseStats = data.careStats ? { ...DEFAULT_CARE_STATS, ...data.careStats } : DEFAULT_CARE_STATS;
          const normalizedStats = baseStats.updatedAt
            ? baseStats
            : {
                ...baseStats,
                updatedAt: data.createdAt
              };
          return {
            id: doc.id,
            ...data,
            cashBalance: data.cashBalance ?? 0,
            cashAchievements: data.cashAchievements ?? [],
            careStats: normalizedStats
          };
        });
        items.sort(
          (a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)
        );
        setKids(items);
        setLoading(false);
      },
      () => {
        setKids([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  return { kids, loading };
};
