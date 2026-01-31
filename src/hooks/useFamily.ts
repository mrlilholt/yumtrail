import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Family } from '../types';

export const useFamily = (ownerUid?: string | null) => {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerUid) {
      setFamily(null);
      setLoading(false);
      return;
    }

    const familyQuery = query(
      collection(db, 'families'),
      where('ownerUid', '==', ownerUid),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      familyQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setFamily(null);
        } else {
          const doc = snapshot.docs[0];
          const data = doc.data() as Omit<Family, 'id'>;
          setFamily({
            id: doc.id,
            ownerUid: data.ownerUid,
            familyName: data.familyName,
            totalPoints: data.totalPoints ?? 0,
            phoneAtTableEnabled: data.phoneAtTableEnabled ?? false,
            unlockedCountries: data.unlockedCountries ?? [],
            pointConfig: data.pointConfig,
            createdAt: data.createdAt
          });
        }
        setLoading(false);
      },
      () => {
        setFamily(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ownerUid]);

  return { family, familyId: family?.id ?? null, loading };
};
