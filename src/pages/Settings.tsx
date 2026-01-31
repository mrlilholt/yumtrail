import { FormEvent, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { AppOutletContext } from './AppShell';
import { db } from '../lib/firebase';
import { useToast } from '../components/ToastProvider';
import { DEFAULT_POINT_CONFIG, getPointConfig } from '../lib/points';
import { PointConfig } from '../types';
import KidsSection from '../components/KidsSection';
import { BadgeDollarSign, ChevronDown, Phone, Percent, Settings2, SlidersHorizontal, Sparkles, Users, Utensils } from 'lucide-react';

const clonePointConfig = (config: PointConfig): PointConfig => ({
  actions: config.actions.map((action) => ({ ...action })),
  meals: config.meals.map((meal) => ({ ...meal })),
  completions: config.completions.map((completion) => ({ ...completion }))
});

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const Settings = () => {
  const { family, familyId } = useOutletContext<AppOutletContext>();
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(family.phoneAtTableEnabled);
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState('');
  const pointConfig = useMemo(() => getPointConfig(family.pointConfig), [family.pointConfig]);
  const [draftConfig, setDraftConfig] = useState<PointConfig>(() => clonePointConfig(pointConfig));
  const [rewardName, setRewardName] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardCost, setRewardCost] = useState(5);
  const [savingReward, setSavingReward] = useState(false);

  useEffect(() => {
    setEnabled(family.phoneAtTableEnabled);
  }, [family.phoneAtTableEnabled]);

  useEffect(() => {
    setDraftConfig(clonePointConfig(pointConfig));
    setConfigError('');
  }, [pointConfig]);

  const handleToggle = async () => {
    if (!familyId) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'families', familyId), {
        phoneAtTableEnabled: next
      });
      showToast('Settings updated.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const updateAction = (id: string, patch: Partial<PointConfig['actions'][number]>) => {
    setDraftConfig((prev) => ({
      ...prev,
      actions: prev.actions.map((action) => (action.id === id ? { ...action, ...patch } : action))
    }));
  };

  const updateMeal = (id: string, patch: Partial<PointConfig['meals'][number]>) => {
    setDraftConfig((prev) => ({
      ...prev,
      meals: prev.meals.map((meal) => (meal.id === id ? { ...meal, ...patch } : meal))
    }));
  };

  const updateCompletion = (id: string, patch: Partial<PointConfig['completions'][number]>) => {
    setDraftConfig((prev) => ({
      ...prev,
      completions: prev.completions.map((completion) =>
        completion.id === id ? { ...completion, ...patch } : completion
      )
    }));
  };

  const handleSavePointConfig = async () => {
    if (!familyId) return;
    setConfigError('');

    const trimmedConfig: PointConfig = {
      actions: draftConfig.actions.map((action) => ({
        ...action,
        label: action.label.trim()
      })),
      meals: draftConfig.meals.map((meal) => ({ ...meal, label: meal.label.trim() })),
      completions: draftConfig.completions.map((completion) => ({
        ...completion,
        label: completion.label.trim()
      }))
    };

    const hasEmptyAction = trimmedConfig.actions.some((action) => !action.label);
    const hasEmptyMeal = trimmedConfig.meals.some((meal) => !meal.label);
    const hasEmptyCompletion = trimmedConfig.completions.some((completion) => !completion.label);

    if (trimmedConfig.actions.length === 0 || trimmedConfig.meals.length === 0 || trimmedConfig.completions.length === 0) {
      setConfigError('Add at least one action, meal, and completion before saving.');
      return;
    }

    if (hasEmptyAction || hasEmptyMeal || hasEmptyCompletion) {
      setConfigError('Every row needs a label before saving.');
      return;
    }

    setSavingConfig(true);
    try {
      await updateDoc(doc(db, 'families', familyId), {
        pointConfig: trimmedConfig
      });
      showToast('Point settings updated.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save point settings.';
      setConfigError(message);
      showToast(message, 'warning');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!familyId) return;
    setSavingConfig(true);
    setConfigError('');
    try {
      await updateDoc(doc(db, 'families', familyId), {
        pointConfig: DEFAULT_POINT_CONFIG
      });
      showToast('Point settings reset to defaults.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reset point settings.';
      setConfigError(message);
      showToast(message, 'warning');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddReward = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!familyId) return;
    if (!rewardName.trim()) {
      showToast('Add a reward name.', 'warning');
      return;
    }
    if (rewardCost <= 0) {
      showToast('Cost must be greater than 0.', 'warning');
      return;
    }
    setSavingReward(true);
    try {
      await addDoc(collection(db, 'rewardItems'), {
        familyId,
        ownerUid: family.ownerUid,
        name: rewardName.trim(),
        description: rewardDescription.trim(),
        cost: Number(rewardCost),
        active: true,
        createdAt: serverTimestamp()
      });
      setRewardName('');
      setRewardDescription('');
      setRewardCost(5);
      showToast('Reward item added.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to add reward item.';
      showToast(message, 'warning');
    } finally {
      setSavingReward(false);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-moss-100 text-pine-900">
            <Settings2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl text-pine-900">Settings</h2>
            <p className="text-sm text-mist-600">Manage reminders, point rules, and real-world rewards.</p>
          </div>
        </div>
      </div>

      <details className="group card p-6" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-100 text-pine-900">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-pine-900">Phone at table reminder</p>
              <p className="text-xs text-mist-600">Show a gentle banner to log later.</p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-mist-500 transition group-open:rotate-180" />
        </summary>
        <div className="mt-4 flex items-center justify-between rounded-2xl border-2 border-mist-200 bg-white/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-pine-900">Phone at table reminder</p>
            <p className="text-xs text-mist-600">
              Show a gentle banner reminding families to log later.
            </p>
          </div>
          <button
            type="button"
            className={`relative h-7 w-12 rounded-full transition ${
              enabled ? 'bg-moss-300' : 'bg-mist-200'
            }`}
            onClick={handleToggle}
            disabled={saving}
            aria-pressed={enabled}
            aria-label="Toggle phone at table reminder"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                enabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </details>

      <details className="group card p-6" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-100 text-pine-900">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-pine-900">Kids</p>
              <p className="text-xs text-mist-600">Manage explorers and avatars.</p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-mist-500 transition group-open:rotate-180" />
        </summary>
        <div className="mt-4">
          <KidsSection showHeader={false} heading="Kids" />
        </div>
      </details>

      <details className="group card p-6" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-100 text-pine-900">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-pine-900">Point inputs</p>
              <p className="text-xs text-mist-600">Customize what earns points.</p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-mist-500 transition group-open:rotate-180" />
        </summary>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm text-mist-600">
              Changes affect new logs. Add or rename highlights, meals, and completion levels.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost text-sm" type="button" onClick={handleResetDefaults} disabled={savingConfig}>
                Reset defaults
              </button>
              <button className="btn-primary text-sm" type="button" onClick={handleSavePointConfig} disabled={savingConfig}>
                {savingConfig ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>

          <details className="group rounded-2xl border-2 border-mist-200 bg-white/70 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mist-100 text-pine-900">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-pine-900">Highlights</p>
                  <p className="text-xs text-mist-600">{draftConfig.actions.length} options</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-mist-500 transition group-open:rotate-180" />
            </summary>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-pine-900">Highlights list</p>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() =>
                    setDraftConfig((prev) => ({
                      ...prev,
                      actions: [
                        ...prev.actions,
                        { id: createId(), label: '', points: 0, requiresFood: false, requiresCountry: false }
                      ]
                    }))
                  }
                >
                  Add highlight
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {draftConfig.actions.map((action) => (
                  <div
                    key={action.id}
                    className="grid gap-3 rounded-2xl border border-mist-200 bg-white/70 p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
                  >
                    <div>
                      <label className="text-xs font-semibold text-mist-700">Label</label>
                      <input
                        className="input mt-1"
                        value={action.label}
                        onChange={(event) => updateAction(action.id, { label: event.target.value })}
                        placeholder="Try a new veggie"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-mist-700">Points</label>
                      <input
                        className="input mt-1"
                        type="number"
                        min={0}
                        value={action.points}
                        onChange={(event) => updateAction(action.id, { points: Number(event.target.value) })}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-mist-700">Requirements</label>
                      <label className="flex items-center gap-2 text-xs text-mist-600">
                        <input
                          type="checkbox"
                          className="accent-moss-400"
                          checked={action.requiresFood ?? false}
                          onChange={(event) => updateAction(action.id, { requiresFood: event.target.checked })}
                        />
                        Food name
                      </label>
                      <label className="flex items-center gap-2 text-xs text-mist-600">
                        <input
                          type="checkbox"
                          className="accent-moss-400"
                          checked={action.requiresCountry ?? false}
                          onChange={(event) =>
                            updateAction(action.id, {
                              requiresCountry: event.target.checked,
                              requiresFood: event.target.checked ? true : action.requiresFood
                            })
                          }
                        />
                        Country
                      </label>
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="btn-ghost text-xs"
                        onClick={() =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            actions: prev.actions.filter((entry) => entry.id !== action.id)
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>

          <details className="group rounded-2xl border-2 border-mist-200 bg-white/70 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mist-100 text-pine-900">
                  <Utensils className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-pine-900">Meals</p>
                  <p className="text-xs text-mist-600">{draftConfig.meals.length} options</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-mist-500 transition group-open:rotate-180" />
            </summary>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-pine-900">Meal list</p>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() =>
                    setDraftConfig((prev) => ({
                      ...prev,
                      meals: [...prev.meals, { id: createId(), label: '', points: 0 }]
                    }))
                  }
                >
                  Add meal
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {draftConfig.meals.map((meal) => (
                  <div
                    key={meal.id}
                    className="grid gap-3 rounded-2xl border border-mist-200 bg-white/70 p-3 md:grid-cols-[2fr_1fr_auto]"
                  >
                    <div>
                      <label className="text-xs font-semibold text-mist-700">Label</label>
                      <input
                        className="input mt-1"
                        value={meal.label}
                        onChange={(event) => updateMeal(meal.id, { label: event.target.value })}
                        placeholder="Snack time"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-mist-700">Points</label>
                      <input
                        className="input mt-1"
                        type="number"
                        min={0}
                        value={meal.points}
                        onChange={(event) => updateMeal(meal.id, { points: Number(event.target.value) })}
                      />
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="btn-ghost text-xs"
                        onClick={() =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            meals: prev.meals.filter((entry) => entry.id !== meal.id)
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>

          <details className="group rounded-2xl border-2 border-mist-200 bg-white/70 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mist-100 text-pine-900">
                  <Percent className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-pine-900">Completion levels</p>
                  <p className="text-xs text-mist-600">{draftConfig.completions.length} options</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-mist-500 transition group-open:rotate-180" />
            </summary>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-pine-900">Completion list</p>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() =>
                    setDraftConfig((prev) => ({
                      ...prev,
                      completions: [...prev.completions, { id: createId(), label: '', multiplier: 1 }]
                    }))
                  }
                >
                  Add completion
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {draftConfig.completions.map((completion) => (
                  <div
                    key={completion.id}
                    className="grid gap-3 rounded-2xl border border-mist-200 bg-white/70 p-3 md:grid-cols-[2fr_1fr_auto]"
                  >
                    <div>
                      <label className="text-xs font-semibold text-mist-700">Label</label>
                      <input
                        className="input mt-1"
                        value={completion.label}
                        onChange={(event) => updateCompletion(completion.id, { label: event.target.value })}
                        placeholder="Partial (50%)"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-mist-700">Multiplier</label>
                      <input
                        className="input mt-1"
                        type="number"
                        min={0}
                        step={0.1}
                        value={completion.multiplier}
                        onChange={(event) =>
                          updateCompletion(completion.id, { multiplier: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="btn-ghost text-xs"
                        onClick={() =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            completions: prev.completions.filter((entry) => entry.id !== completion.id)
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {configError ? <p className="text-sm text-sun-700">{configError}</p> : null}
        </div>
      </details>

      <details className="group card p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-100 text-pine-900">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-pine-900">Real-world rewards</p>
              <p className="text-xs text-mist-600">Add items kids can cash out for.</p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-mist-500 transition group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <form className="space-y-3" onSubmit={handleAddReward}>
            <div>
              <label className="text-xs font-semibold text-mist-700">Reward name</label>
              <input
                className="input mt-1"
                value={rewardName}
                onChange={(event) => setRewardName(event.target.value)}
                placeholder="Trip to Starbucks"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-mist-700">Description</label>
              <input
                className="input mt-1"
                value={rewardDescription}
                onChange={(event) => setRewardDescription(event.target.value)}
                placeholder="Hot chocolate date"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-mist-700">Cost ($)</label>
              <input
                className="input mt-1"
                type="number"
                min={1}
                step={0.5}
                value={rewardCost}
                onChange={(event) => setRewardCost(Number(event.target.value))}
              />
            </div>
            <button className="btn-primary w-full text-sm" type="submit" disabled={savingReward}>
              {savingReward ? 'Saving...' : 'Add reward'}
            </button>
          </form>
          <div className="rounded-2xl border-2 border-mist-200 bg-white/70 p-4 text-sm text-mist-600">
            <p className="text-sm font-semibold text-pine-900">Where rewards show up</p>
            <p className="mt-2 text-xs text-mist-600">
              Rewards appear in the Rewards page and are grayed out until kids can afford them.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
};

export default Settings;
