import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, increment, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { AppOutletContext } from './AppShell';
import { db } from '../lib/firebase';
import { useKids } from '../hooks/useKids';
import { useRewardItems } from '../hooks/useRewardItems';
import { useRewardRequests } from '../hooks/useRewardRequests';
import { useToast } from '../components/ToastProvider';
import AvatarIcon from '../components/AvatarIcon';
import { formatCash } from '../lib/cash';
import { BadgeDollarSign, CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';

const Rewards = () => {
  const { familyId } = useOutletContext<AppOutletContext>();
  const { kids } = useKids(familyId);
  const { items } = useRewardItems(familyId);
  const { requests } = useRewardRequests(familyId);
  const { showToast } = useToast();

  const [selectedKidId, setSelectedKidId] = useState('');
  const [saving, setSaving] = useState(false);
  const [sharedMode, setSharedMode] = useState(false);
  const [contributions, setContributions] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!selectedKidId && kids.length > 0) {
      setSelectedKidId(kids[0].id);
    }
  }, [kids, selectedKidId]);

  const kidMap = useMemo(() => new Map(kids.map((kid) => [kid.id, kid])), [kids]);
  const selectedKid = useMemo(() => kidMap.get(selectedKidId), [kidMap, selectedKidId]);
  const cashBalance = selectedKid?.cashBalance ?? 0;
  const totalContribution = useMemo(
    () => Object.values(contributions).reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0),
    [contributions]
  );
  const hasSharedContribution = totalContribution > 0;
  const sharedWithinBalances = useMemo(
    () =>
      Object.entries(contributions).every(([kidId, amount]) => {
        const kid = kidMap.get(kidId);
        if (!kid) return true;
        return amount <= (kid.cashBalance ?? 0) && amount >= 0;
      }),
    [contributions, kidMap]
  );

  useEffect(() => {
    if (!sharedMode) return;
    setContributions((prev) => {
      const next: Record<string, number> = {};
      kids.forEach((kid) => {
        next[kid.id] = prev[kid.id] ?? 0;
      });
      return next;
    });
  }, [kids, sharedMode]);

  const handleRequest = async (itemId: string) => {
    if (!familyId) return;
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;

    if (sharedMode) {
      if (!hasSharedContribution) {
        showToast('Add shared contributions first.', 'warning');
        return;
      }
      if (!sharedWithinBalances) {
        showToast('One of the contributions is more than a kid has.', 'warning');
        return;
      }
      const sharedDelta = totalContribution - item.cost;
      if (sharedDelta < -0.01) {
        showToast(`Add $${formatCash(Math.abs(sharedDelta))} more to share this reward.`, 'warning');
        return;
      }
      if (sharedDelta > 0.01) {
        showToast('Shared total must match the reward cost.', 'warning');
        return;
      }
    } else {
      if (!selectedKidId) {
        showToast('Pick a kid first.', 'warning');
        return;
      }
      const kid = kidMap.get(selectedKidId);
      if (!kid) return;
      if ((kid.cashBalance ?? 0) < item.cost) {
        showToast('Not enough cash for this reward yet.', 'warning');
        return;
      }
    }
    setSaving(true);
    try {
      const sharedContributions = sharedMode
        ? Object.entries(contributions)
            .filter(([, amount]) => amount > 0)
            .map(([kidId, amount]) => ({ kidId, amount }))
        : [];
      await addDoc(collection(db, 'rewardRequests'), {
        familyId,
        kidId: sharedMode ? (selectedKidId || sharedContributions[0]?.kidId || '') : selectedKidId,
        itemId: item.id,
        itemName: item.name,
        cost: item.cost,
        shared: sharedMode,
        sharedTotal: sharedMode ? totalContribution : undefined,
        sharedContributions: sharedMode ? sharedContributions : undefined,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      showToast(sharedMode ? 'Shared request sent to parent!' : 'Request sent to parent!', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to request reward.';
      showToast(message, 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!familyId) return;
    const request = requests.find((entry) => entry.id === requestId);
    if (!request) return;
    if (request.sharedContributions?.length) {
      const total = request.sharedContributions.reduce((sum, entry) => sum + entry.amount, 0);
      if (Math.abs(total - request.cost) > 0.01) {
        showToast('Shared contributions do not match the reward cost.', 'warning');
        return;
      }
    }
    const contributionsList = request.sharedContributions ?? [];
    if (contributionsList.length > 0) {
      const invalid = contributionsList.some((entry) => {
        const kid = kidMap.get(entry.kidId);
        return (kid?.cashBalance ?? 0) < entry.amount;
      });
      if (invalid) {
        showToast('One or more kids do not have enough cash to approve this.', 'warning');
        return;
      }
    } else {
      const kid = kidMap.get(request.kidId);
      if (!kid) return;
      if ((kid.cashBalance ?? 0) < request.cost) {
        showToast('Kid does not have enough cash to approve this.', 'warning');
        return;
      }
    }
    setSaving(true);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'rewardRequests', request.id), {
        status: 'approved',
        approvedAt: serverTimestamp()
      });
      if (contributionsList.length > 0) {
        contributionsList.forEach((entry) => {
          batch.update(doc(db, 'kids', entry.kidId), {
            cashBalance: increment(-entry.amount)
          });
        });
      } else {
        batch.update(doc(db, 'kids', request.kidId), {
          cashBalance: increment(-request.cost)
        });
      }
      await batch.commit();
      showToast('Request approved and cash deducted.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to approve request.';
      showToast(message, 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleDeny = async (requestId: string) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'rewardRequests', requestId), {
        status: 'denied',
        deniedAt: serverTimestamp()
      });
      showToast('Request denied.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to deny request.';
      showToast(message, 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleClaim = async (requestId: string) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'rewardRequests', requestId), {
        status: 'claimed',
        claimedAt: serverTimestamp()
      });
      showToast('Reward claimed!', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to mark claimed.';
      showToast(message, 'warning');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 py-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl text-pine-900">Cash out</h2>
            <p className="text-sm text-mist-600">
              Kids earn real-world cash for achievements and can request rewards.
            </p>
          </div>
          <div className="rounded-full border-2 border-mist-200 bg-white/80 px-3 py-1 text-xs font-semibold text-pine-900">
            💵 Cash is separate from island points.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kids.map((kid) => (
            <div key={kid.id} className="rounded-2xl border-2 border-mist-200 bg-white/80 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-moss-100 text-pine-900">
                  <AvatarIcon avatar={kid.avatar} className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-pine-900">{kid.name}</p>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-mist-100 px-3 py-1 text-xs font-semibold text-pine-900">
                    <BadgeDollarSign className="h-4 w-4" />
                    ${formatCash(kid.cashBalance ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {kids.length === 0 ? (
            <p className="text-sm text-mist-600">Add a kid first to start rewards.</p>
          ) : null}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg text-pine-900">Real-world store</h3>
            <p className="text-sm text-mist-600">Rewards show what kids can afford right now.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="select max-w-[220px]"
              value={selectedKidId}
              onChange={(event) => setSelectedKidId(event.target.value)}
              disabled={sharedMode}
            >
              {kids.map((kid) => (
                <option key={kid.id} value={kid.id}>
                  {kid.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`rounded-full border-2 px-3 py-1 text-xs font-semibold transition ${
                sharedMode
                  ? 'border-moss-300 bg-moss-100 text-pine-900'
                  : 'border-mist-200 bg-white text-mist-600 hover:bg-mist-100'
              }`}
              onClick={() => setSharedMode((prev) => !prev)}
            >
              {sharedMode ? 'Shared on' : 'Shared off'}
            </button>
          </div>
        </div>

        {sharedMode ? (
          <div className="mt-4 rounded-2xl border-2 border-mist-200 bg-white/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-pine-900">Shared cash out</p>
                <p className="text-xs text-mist-600">Set how much each kid contributes.</p>
              </div>
              <span className="rounded-full bg-moss-100 px-3 py-1 text-xs font-semibold text-pine-900">
                Shared total: ${formatCash(totalContribution)}
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {kids.map((kid) => (
                <div key={kid.id} className="flex items-center justify-between gap-3 rounded-xl border border-mist-200 bg-white/70 px-3 py-2 text-xs">
                  <div>
                    <p className="text-sm font-semibold text-pine-900">{kid.name}</p>
                    <p className="text-[11px] text-mist-500">Available: ${formatCash(kid.cashBalance ?? 0)}</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="input w-28 text-right"
                    value={contributions[kid.id] ?? 0}
                    onChange={(event) =>
                      setContributions((prev) => ({
                        ...prev,
                        [kid.id]: Number(event.target.value)
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-mist-500">
              Total must match the reward cost to submit a shared request.
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const isActive = item.active !== false;
            const sharedDelta = totalContribution - item.cost;
            const sharedShortfall = Math.max(0, item.cost - totalContribution);
            const sharedExact = Math.abs(sharedDelta) < 0.01;
            const canAfford = sharedMode
              ? hasSharedContribution && sharedWithinBalances && sharedExact
              : Boolean(selectedKid) && cashBalance >= item.cost;
            const shortfall = sharedMode ? sharedShortfall : Math.max(0, item.cost - cashBalance);
            const isLocked = !isActive || !canAfford;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border-2 border-mist-200 bg-white/80 p-4 transition ${
                  isLocked ? 'opacity-50 grayscale' : 'shadow-soft'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-pine-900">{item.name}</p>
                    <p className="text-xs text-mist-600">{item.description}</p>
                    <p className="mt-1 text-[11px] text-mist-500">
                      {sharedMode
                        ? canAfford
                          ? 'Shared total meets cost.'
                          : sharedDelta > 0.01
                          ? `Over by $${formatCash(sharedDelta)} — match the cost.`
                          : `Need $${formatCash(shortfall)} more to share.`
                        : !selectedKid
                        ? 'Pick a kid to see availability.'
                        : canAfford
                        ? 'Available now!'
                        : `Need $${formatCash(shortfall)} more.`}
                    </p>
                  </div>
                  <span className="rounded-full bg-moss-100 px-3 py-1 text-xs font-semibold text-pine-900">
                    ${formatCash(item.cost)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-primary mt-4 w-full text-xs"
                  onClick={() => handleRequest(item.id)}
                  disabled={saving || !selectedKid || !isActive || !canAfford}
                >
                  {isActive ? (canAfford ? 'Request reward' : 'Locked') : 'Unavailable'}
                </button>
              </div>
            );
          })}
          {items.length === 0 ? (
            <p className="text-sm text-mist-600">No rewards yet. Add your first one in Settings.</p>
          ) : null}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg text-pine-900">Requests</h3>
          <span className="text-xs text-mist-600">Parent approvals</span>
        </div>
        <div className="mt-4 space-y-3">
          {requests.length === 0 ? (
            <p className="text-sm text-mist-600">No requests yet.</p>
          ) : (
            requests.map((request) => {
              const kid = kidMap.get(request.kidId);
              const statusLabel =
                request.status === 'pending'
                  ? 'Pending'
                  : request.status === 'approved'
                  ? 'Approved'
                  : request.status === 'claimed'
                  ? 'Claimed'
                  : 'Denied';
              const StatusIcon =
                request.status === 'pending'
                  ? Clock
                  : request.status === 'approved'
                  ? ShieldCheck
                  : request.status === 'claimed'
                  ? CheckCircle2
                  : XCircle;
              return (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-2xl border-2 border-mist-200 bg-white/80 p-4 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-pine-900">
                      {request.sharedContributions?.length ? 'Shared' : kid?.name ?? 'Kid'} • {request.itemName}
                    </p>
                    <p className="text-xs text-mist-600">${formatCash(request.cost)} requested</p>
                    {request.sharedContributions?.length ? (
                      <p className="mt-1 text-[11px] text-mist-500">
                        {request.sharedContributions
                          .map((entry) => {
                            const name = kidMap.get(entry.kidId)?.name ?? 'Kid';
                            return `${name}: $${formatCash(entry.amount)}`;
                          })
                          .join(' • ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border-2 border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-pine-900">
                      <StatusIcon className="h-4 w-4" />
                      {statusLabel}
                    </span>
                    {request.status === 'pending' ? (
                      <>
                        <button className="btn-primary text-xs" type="button" onClick={() => handleApprove(request.id)} disabled={saving}>
                          Approve
                        </button>
                        <button className="btn-ghost text-xs" type="button" onClick={() => handleDeny(request.id)} disabled={saving}>
                          Deny
                        </button>
                      </>
                    ) : null}
                    {request.status === 'approved' ? (
                      <button className="btn-ghost text-xs" type="button" onClick={() => handleClaim(request.id)} disabled={saving}>
                        Mark claimed
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Rewards;
