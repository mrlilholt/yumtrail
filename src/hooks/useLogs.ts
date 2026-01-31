import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Log } from '../types';

export const useLogs = (familyId?: string | null, limitCount = 50) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const logsQuery = query(collection(db, 'logs'), where('familyId', '==', familyId));

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Log, 'id'>)
        }));
        items.sort(
          (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
        );
        setLogs(items.slice(0, limitCount));
        setLoading(false);
      },
      () => {
        setLogs([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [familyId, limitCount]);

  return { logs, loading };
};
