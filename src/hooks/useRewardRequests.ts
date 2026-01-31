import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RewardRequest } from '../types';

export const useRewardRequests = (familyId?: string | null) => {
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const requestsQuery = query(collection(db, 'rewardRequests'), where('familyId', '==', familyId));

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<RewardRequest, 'id'>)
        }));
        data.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setRequests(data);
        setLoading(false);
      },
      () => {
        setRequests([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [familyId]);

  return { requests, loading };
};
