import { useEffect, useMemo, useState } from 'react';
import { ActionDefinition, CompletionDefinition, ForestItem, Log, MealDefinition } from '../types';
import { getActionLabel, getActionLabels, getCompletionLabel, getMealLabel } from '../lib/points';
import { FOREST_CATALOG, FOREST_CATEGORIES, ForestCatalogItem, ForestItemId } from '../lib/forestCatalog';
import ForestItemSvg from './ForestItemSvg';
import { getCountryByCode } from '../lib/countries';

type ForestStoreModalProps = {
  open: boolean;
  ownerName: string;
  ownerType: 'kid' | 'family';
  items: ForestItem[];
  logs: Log[];
  actions: ActionDefinition[];
  meals: MealDefinition[];
  completions: CompletionDefinition[];
  availablePoints: number;
  spentPoints: number;
  maxSlots: number;
  onClose: () => void;
  onStartPlacement: (item: ForestCatalogItem, sourceLogId?: string) => void;
  onRemoveItem: (itemId: string) => void;
};

const formatLogLabel = (
  log: Log,
  {
    actions,
    meals,
    completions
  }: { actions: ActionDefinition[]; meals: MealDefinition[]; completions: CompletionDefinition[] }
) => {
  const dateLabel = log.createdAt?.toDate().toLocaleDateString() ?? 'Just now';
  const countryName = getCountryByCode(log.countryCode)?.name;
  const foodLabels = log.foodLabels?.length
    ? log.foodLabels
    : log.foodLabel
    ? [log.foodLabel]
    : log.foodName
    ? [log.foodName]
    : [];
  const foodLabel = foodLabels.length > 0 ? ` • ${foodLabels.join(' + ')}` : '';
  const actionLabel = getActionLabels(
    actions,
    log.actionTypes,
    log.actionLabels,
    log.actionType ? getActionLabel(actions, log.actionType, log.actionLabel) : log.actionLabel
  );
  const countryLabel = countryName ? ` • ${countryName}` : '';
  const mealLabel = log.mealType
    ? ` • ${getMealLabel(meals, log.mealType, log.mealLabel)}`
    : '';
  const completionLabel = log.mealCompletion
    ? ` • ${getCompletionLabel(completions, log.mealCompletion, log.completionLabel)}`
    : '';
  return `${actionLabel}${foodLabel}${countryLabel}${mealLabel}${completionLabel} (${dateLabel})`;
};

const ForestStoreModal = ({
  open,
  ownerName,
  ownerType,
  items,
  logs,
  actions,
  meals,
  completions,
  availablePoints,
  spentPoints,
  maxSlots,
  onClose,
  onStartPlacement,
  onRemoveItem
}: ForestStoreModalProps) => {
  const [activeCategory, setActiveCategory] = useState<'all' | (typeof FOREST_CATEGORIES)[number]>(
    'all'
  );
  const [selectedLogId, setSelectedLogId] = useState<string>('');

  const recentLogId = logs[0]?.id ?? '';

  useEffect(() => {
    if (ownerType === 'kid') {
      setSelectedLogId(recentLogId);
    } else {
      setSelectedLogId('');
    }
  }, [ownerType, recentLogId]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const catalogItems = useMemo(() => {
    if (activeCategory === 'all') return FOREST_CATALOG;
    return FOREST_CATALOG.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pine-900/40 px-4 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="card relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`Forest store for ${ownerName}`}
      >
        <div className="flex items-center justify-between border-b border-mist-200 px-6 py-4">
          <div>
            <h3 className="text-lg text-pine-900">Forest store for {ownerName}</h3>
            <p className="text-sm text-mist-600">
              Spend points to place items. Choose a spot on the island after selecting an item.
            </p>
          </div>
          <button
            className="btn-ghost text-sm"
            onClick={onClose}
            aria-label="Close forest store"
            type="button"
          >
            Close
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-moss-100 px-3 py-1 text-xs font-semibold text-pine-900">
                Available: {availablePoints} pts
              </span>
              <span className="rounded-full bg-mist-100 px-3 py-1 text-xs font-semibold text-pine-900">
                Spent: {spentPoints} pts
              </span>
              <span className="rounded-full bg-sun-100 px-3 py-1 text-xs font-semibold text-pine-900">
                Slots: {items.length}/{maxSlots}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  activeCategory === 'all'
                    ? 'bg-pine-700 text-white'
                    : 'border border-mist-200 text-pine-700'
                }`}
              >
                All
              </button>
              {FOREST_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    activeCategory === category
                      ? 'bg-pine-700 text-white'
                      : 'border border-mist-200 text-pine-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {ownerType === 'kid' ? (
              <div className="rounded-xl border border-mist-200 bg-white/70 px-4 py-3 text-sm">
                <label className="text-xs font-semibold text-mist-700">Attach to a logged meal</label>
                <select
                  className="select mt-2"
                  value={selectedLogId}
                  onChange={(event) => setSelectedLogId(event.target.value)}
                >
                  {logs.length === 0 ? (
                    <option value="">No logs yet</option>
                  ) : (
                    logs.map((log) => (
                      <option key={log.id} value={log.id}>
                        {formatLogLabel(log, { actions, meals, completions })}
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {catalogItems.map((item) => {
                const canAfford = availablePoints >= item.cost;
                const slotsAvailable = items.length < maxSlots;
                return (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-mist-200 bg-white/80 p-4 shadow-soft"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-pine-900">{item.name}</h4>
                        <p className="text-xs text-mist-600">{item.description}</p>
                      </div>
                      <span className="rounded-full bg-moss-100 px-2 py-1 text-xs font-semibold text-pine-900">
                        {item.cost} pts
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <svg viewBox="0 0 80 80" className="h-16 w-16 origin-center transition-transform duration-200 group-hover:scale-[2.5]">
                        <ForestItemSvg itemId={item.id} x={40} y={40} scale={1} />
                      </svg>
                      <button
                        type="button"
                        className="btn-primary h-9 px-4 text-xs"
                        disabled={!canAfford || !slotsAvailable}
                        onClick={() => onStartPlacement(item, selectedLogId || undefined)}
                      >
                        {slotsAvailable ? (canAfford ? 'Choose spot' : 'Need more points') : 'Island full'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-pine-900">Placed items</h4>
              <p className="text-xs text-mist-600">Remove items to refund points.</p>
            </div>
            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-mist-300 bg-mist-50 px-4 py-6 text-sm text-mist-600">
                  No items placed yet.
                </div>
              ) : (
                items.map((item) => {
                  const catalog = FOREST_CATALOG.find((entry) => entry.id === item.itemId);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-mist-200 bg-white/70 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <svg viewBox="0 0 60 60" className="h-12 w-12">
                          <ForestItemSvg itemId={item.itemId as ForestItemId} x={30} y={30} scale={0.85} />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-pine-900">
                            {catalog?.name ?? 'Forest item'}
                          </p>
                          <p className="text-xs text-mist-600">Refund {item.cost} pts</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-ghost text-xs"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-mist-200 px-6 py-4">
          <button className="btn-ghost text-sm" type="button" onClick={onClose}>
            Close store
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForestStoreModal;
