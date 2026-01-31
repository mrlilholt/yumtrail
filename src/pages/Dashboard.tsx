import { useMemo, useState } from 'react';
import { arrayRemove, collection, doc, getDocs, increment, orderBy, query, where, writeBatch } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { AppOutletContext } from './AppShell';
import { useKids } from '../hooks/useKids';
import { useLogs } from '../hooks/useLogs';
import { getActionLabel, getActionLabels, getCompletionLabel, getMealLabel, getPointConfig } from '../lib/points';
import { calcCashFromPoints } from '../lib/cash';
import { db } from '../lib/firebase';
import { ForestItem, Log } from '../types';
import { useToast } from '../components/ToastProvider';

const pruneForestItems = async ({
  ownerType,
  ownerId,
  logId,
  maxPoints
}: {
  ownerType: 'kid' | 'family';
  ownerId: string;
  logId: string;
  maxPoints: number;
}) => {
  const itemsRef = collection(db, ownerType === 'kid' ? 'kids' : 'families', ownerId, 'forestItems');
  const itemsQuery = query(itemsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(itemsQuery);
  const items = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ref: docSnap.ref,
    ...(docSnap.data() as Omit<ForestItem, 'id'>)
  }));

  let spent = items.reduce((sum, item) => sum + item.cost, 0);

  const toRemove = new Set<string>();

  for (const item of items) {
    if (item.sourceLogId === logId) {
      toRemove.add(item.id);
      spent -= item.cost;
    }
  }

  for (const item of items) {
    if (spent <= maxPoints) break;
    if (toRemove.has(item.id)) continue;
    toRemove.add(item.id);
    spent -= item.cost;
  }

  if (toRemove.size === 0) return;

  const batch = writeBatch(db);
  items.forEach((item) => {
    if (toRemove.has(item.id)) {
      batch.delete(item.ref);
    }
  });
  await batch.commit();
};

const Dashboard = () => {
  const { family, familyId } = useOutletContext<AppOutletContext>();
  const { kids } = useKids(familyId);
  const { logs } = useLogs(familyId);
  const { showToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pointConfig = useMemo(() => getPointConfig(family.pointConfig), [family.pointConfig]);
  const { actions, meals, completions } = pointConfig;

  const kidMap = useMemo(() => {
    return new Map(kids.map((kid) => [kid.id, kid.name]));
  }, [kids]);

  const kidById = useMemo(() => {
    return new Map(kids.map((kid) => [kid.id, kid]));
  }, [kids]);

  const weekPoints = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return logs.reduce((sum, log) => {
      const createdAt = log.createdAt?.toDate().getTime() ?? 0;
      return createdAt >= cutoff ? sum + log.pointsAwarded : sum;
    }, 0);
  }, [logs]);

  const getLogActionLabel = (log: Log) =>
    getActionLabels(
      actions,
      log.actionTypes,
      log.actionLabels,
      log.actionType ? getActionLabel(actions, log.actionType, log.actionLabel) : log.actionLabel
    );

  const handleDeleteLog = async (log: Log) => {
    if (!familyId) return;
    const kid = kidById.get(log.kidId);
    if (!kid) return;
    const confirmed = window.confirm('Delete this log? This will remove points and may remove forest items.');
    if (!confirmed) return;

    setDeletingId(log.id);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'logs', log.id));
      batch.update(doc(db, 'kids', log.kidId), {
        points: increment(-log.pointsAwarded),
        cashBalance: increment(-calcCashFromPoints(log.pointsAwarded))
      });
      batch.update(doc(db, 'families', familyId), {
        totalPoints: increment(-log.pointsAwarded)
      });
      await batch.commit();

      if (log.countryCode) {
        const countryQuery = query(
          collection(db, 'logs'),
          where('familyId', '==', familyId),
          where('countryCode', '==', log.countryCode)
        );
        const countrySnap = await getDocs(countryQuery);
        if (countrySnap.empty) {
          const countryBatch = writeBatch(db);
          countryBatch.update(doc(db, 'families', familyId), {
            unlockedCountries: arrayRemove(log.countryCode)
          });
          await countryBatch.commit();
        }
      }

      const updatedKidPoints = kid.points - log.pointsAwarded;
      const updatedFamilyPoints = family.totalPoints - log.pointsAwarded;

      await pruneForestItems({
        ownerType: 'kid',
        ownerId: log.kidId,
        logId: log.id,
        maxPoints: updatedKidPoints
      });

      await pruneForestItems({
        ownerType: 'family',
        ownerId: familyId,
        logId: log.id,
        maxPoints: updatedFamilyPoints
      });

      showToast('Log deleted and forest items updated.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete log.';
      showToast(message, 'warning');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 py-6">
      <div className="card card-scenic-dash p-6 md:p-8 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl text-pine-900">Trail dashboard</h2>
            <p className="mt-1 text-sm text-mist-600">
              Cheer on your explorers and watch the points add up.
            </p>
          </div>
          <div className="rounded-full border-2 border-mist-200 bg-white/80 px-4 py-2 text-xs font-semibold text-pine-900">
            🌈 Family points: {family.totalPoints}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-mist-200 bg-white/80 p-4">
            <p className="text-xs font-semibold text-mist-600">Family total points</p>
            <p className="mt-2 text-2xl font-semibold text-pine-900">🏆 {family.totalPoints}</p>
          </div>
          <div className="rounded-2xl border-2 border-mist-200 bg-white/80 p-4">
            <p className="text-xs font-semibold text-mist-600">Points in the last 7 days</p>
            <p className="mt-2 text-2xl font-semibold text-pine-900">📅 {weekPoints}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-pine-900">Recent activity</h2>
          <span className="text-xs text-mist-600">Last 10 logs</span>
        </div>
        <div className="mt-4 space-y-3">
          {logs.slice(0, 10).map((log) => {
            const kidName = kidMap.get(log.kidId) ?? 'Kid';
            const actionLabel = getLogActionLabel(log);
            const mealLabel = log.mealType ? getMealLabel(meals, log.mealType, log.mealLabel) : 'Meal';
            const completionLabel = log.mealCompletion
              ? getCompletionLabel(completions, log.mealCompletion, log.completionLabel)
              : 'Completion';
            const dateLabel = log.createdAt?.toDate().toLocaleDateString() ?? 'Just now';
            return (
              <div
                key={log.id}
                className="flex flex-col gap-3 rounded-2xl border-2 border-mist-200 bg-white/80 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-pine-900">
                    {kidName} earned {log.pointsAwarded} points
                  </p>
                  <p className="text-xs text-mist-600">
                    {actionLabel} • {mealLabel} • {completionLabel}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-mist-500">{dateLabel}</span>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => handleDeleteLog(log)}
                    disabled={deletingId === log.id}
                  >
                    {deletingId === log.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
          {logs.length === 0 ? (
            <p className="text-sm text-mist-600">No logs yet. Log a meal to start the trail.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
