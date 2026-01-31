import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ForestItem } from '../types';

export const useKidForestItems = (kidId?: string | null) => {
  const [items, setItems] = useState<ForestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kidId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const itemsQuery = query(
      collection(db, 'kids', kidId, 'forestItems'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const nextItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<ForestItem, 'id'>)
        }));
        setItems(nextItems);
        setLoading(false);
      },
      () => {
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [kidId]);

  return { items, loading };
};

export const useFamilyForestItems = (familyId?: string | null) => {
  const [items, setItems] = useState<ForestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const itemsQuery = query(
      collection(db, 'families', familyId, 'forestItems'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const nextItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<ForestItem, 'id'>)
        }));
        setItems(nextItems);
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

export const useForestItemsByKidIds = (kidIds: string[]) => {
  const [itemsByKid, setItemsByKid] = useState<Record<string, ForestItem[]>>({});
  const [loading, setLoading] = useState(true);

  const stableIds = useMemo(() => {
    return kidIds.filter(Boolean).slice().sort();
  }, [kidIds]);

  useEffect(() => {
    if (stableIds.length === 0) {
      setItemsByKid({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const pending = new Set(stableIds);
    const unsubscribes = stableIds.map((kidId) => {
      const itemsQuery = query(
        collection(db, 'kids', kidId, 'forestItems'),
        orderBy('createdAt', 'asc')
      );
      return onSnapshot(
        itemsQuery,
        (snapshot) => {
          const nextItems = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<ForestItem, 'id'>)
          }));
          setItemsByKid((prev) => ({
            ...prev,
            [kidId]: nextItems
          }));
          pending.delete(kidId);
          if (pending.size === 0) {
            setLoading(false);
          }
        },
        () => {
          setItemsByKid((prev) => ({
            ...prev,
            [kidId]: []
          }));
          pending.delete(kidId);
          if (pending.size === 0) {
            setLoading(false);
          }
        }
      );
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [stableIds.join('|')]);

  return { itemsByKid, loading };
};
