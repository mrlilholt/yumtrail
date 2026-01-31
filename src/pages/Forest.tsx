import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { Link, useOutletContext } from 'react-router-dom';
import { AppOutletContext } from './AppShell';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { useKids } from '../hooks/useKids';
import { useLogs } from '../hooks/useLogs';
import { useForestItemsByKidIds, useFamilyForestItems } from '../hooks/useForestItems';
import { useMediaQuery } from '../hooks/useMediaQuery';
import ForestIslandSvg, { ForestIslandItem } from '../components/ForestIslandSvg';
import FamilyLIslandSvg from '../components/FamilyLIslandSvg';
import ForestStoreModal from '../components/ForestStoreModal';
import AvatarIcon from '../components/AvatarIcon';
import { getActionLabel, getActionLabels, getCompletionLabel, getMealLabel, getPointConfig } from '../lib/points';
import { ForestCatalogItem, getForestItemById } from '../lib/forestCatalog';
import { getCountryByCode } from '../lib/countries';
import { getSlotsForSize, sizeConfig } from '../lib/forestLayout';
import { useToast } from '../components/ToastProvider';
import { ForestItem, Kid, Log } from '../types';
import { calcCashFromPoints } from '../lib/cash';
import {
  ChefHat,
  Cloud,
  Compass,
  CupSoda,
  Flag,
  Gamepad2,
  HandHeart,
  Medal,
  Moon,
  Paintbrush,
  Sparkles,
  Smile,
  Trash2,
  Utensils
} from 'lucide-react';
import { CASH_ACHIEVEMENTS } from '../lib/cashAchievements';
import { AVATAR_OPTIONS } from '../lib/avatars';
import { DEFAULT_CARE_STATS, clampCareStat, getDecayedCareStats } from '../lib/careStats';

const ACTION_ICONS: Record<string, typeof Sparkles> = {
  TRY_NEW: Sparkles,
  NO_COMPLAINT: Smile,
  HELP_COOK: ChefHat,
  FINISH_MEAL: Medal,
  INTERNATIONAL: Compass
};

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

type StoreTarget =
  | {
      type: 'kid';
      kid: Kid;
    }
  | {
      type: 'family';
    };

type PlacementRequest = {
  item: ForestCatalogItem;
  sourceLogId?: string;
  target: StoreTarget;
};

type RelocationRequest = {
  item: ForestItem;
  target: StoreTarget;
};

const MIN_ZOOM = 0.85;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.5;
const PAN_THRESHOLD = 1.02;

const Forest = () => {
  const { family, familyId } = useOutletContext<AppOutletContext>();
  const { user } = useAuth();
  const { kids } = useKids(familyId);
  const { logs } = useLogs(familyId, 200);
  const { itemsByKid } = useForestItemsByKidIds(kids.map((kid) => kid.id));
  const { items: familyItems } = useFamilyForestItems(familyId);
  const { showToast } = useToast();
  const isCompact = useMediaQuery('(max-width: 768px)');
  const pointConfig = useMemo(() => getPointConfig(family.pointConfig), [family.pointConfig]);
  const { actions, meals, completions } = pointConfig;
  const canDeleteLogs = user?.uid === family.ownerUid;

  const [storeTarget, setStoreTarget] = useState<StoreTarget | null>(null);
  const [placement, setPlacement] = useState<PlacementRequest | null>(null);
  const [relocation, setRelocation] = useState<RelocationRequest | null>(null);
  const [zoomLevels, setZoomLevels] = useState<Record<string, number>>({});
  const [panOffsets, setPanOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [activePanKey, setActivePanKey] = useState<string | null>(null);
  const [manualAvatarIds, setManualAvatarIds] = useState<Record<string, boolean>>({});
  const [manualAvatarPositions, setManualAvatarPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [activeKidId, setActiveKidId] = useState('');
  const [avatarModalKid, setAvatarModalKid] = useState<Kid | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [bubbleOverrides, setBubbleOverrides] = useState<
    Record<string, { message: string; token: number; expiresAt: number; scale: number }>
  >({});
  const [now, setNow] = useState(() => new Date());

  const panState = useRef<{
    key: string;
    startX: number;
    startY: number;
    origin: { x: number; y: number };
    maxX: number;
    maxY: number;
  } | null>(null);
  const panContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const panContentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bubbleTimeouts = useRef<Record<string, number>>({});

  const logsById = useMemo(() => new Map(logs.map((log) => [log.id, log])), [logs]);
  const logsByKidId = useMemo(() => {
    const map = new Map<string, Log[]>();
    logs.forEach((log) => {
      const bucket = map.get(log.kidId) ?? [];
      bucket.push(log);
      map.set(log.kidId, bucket);
    });
    return map;
  }, [logs]);
  const mapScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const mapHasAutoScrolled = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(bubbleTimeouts.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const state = panState.current;
      if (!state) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const next = { x: state.origin.x + dx, y: state.origin.y + dy };
      const clamped = {
        x: Math.max(-state.maxX, Math.min(state.maxX, next.x)),
        y: Math.max(-state.maxY, Math.min(state.maxY, next.y))
      };
      setPanOffsets((prev) => ({ ...prev, [state.key]: clamped }));
    };

    const handleUp = () => {
      if (!panState.current) return;
      panState.current = null;
      setActivePanKey(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    
    // Keyboard Navigation for Moving Manual Avatar
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only move if we have an active kid and their avatar is in manual mode
      if (!activeKidId || !manualAvatarIds[activeKidId]) return;
      
      const speed = 20;
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          dy = -speed;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          dy = speed;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          dx = -speed;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          dx = speed;
          break;
        default:
          return;
      }

      setManualAvatarPositions((prev) => {
        // Default start position (center of kid island: 640x380 svg, center x=320, center y=140)
        const current = prev[activeKidId] ?? { x: 320, y: 140 };
        
        const nextX = current.x + dx;
        const nextY = current.y + dy;

        // Island boundaries logic (mirrors ForestIslandSvg 'kid' size)
        const config = sizeConfig.kid;
        const centerX = config.width / 2;
        // Correct height calculation to use slotStep instead of tile size
        // Removed gridOffsetY adjustment to match component
        const topY = config.centerY - (config.slotStep * config.gridMax) / 2;
        const validSlots = getSlotsForSize('kid');

        // Check if the new position is within range of any valid tile
        // We give a generous radius (equal to step size) so it feels like walking on the surface
        const isOnIsland = validSlots.some((slot) => {
          const slotX = centerX + (slot.x - slot.y) * config.slotStep;
          const slotY = topY + (slot.x + slot.y) * config.slotStep * 0.5;
          const distSq = (nextX - slotX) ** 2 + (nextY - slotY) ** 2;
          // Tighter radius (0.8 of step) to ensure avatar stays strictly on the flat service
          return distSq < (config.slotStep * 0.8) ** 2;
        });

        // additional bounds check for overall svg
        const inBounds = nextX >= 0 && nextX <= config.width && nextY >= 0 && nextY <= config.height;

        if (isOnIsland && inBounds) {
          return {
            ...prev,
            [activeKidId]: { x: nextX, y: nextY }
          };
        }
        
        // If movement is blocked, return previous state
        return prev;
      });
      e.preventDefault(); // Prevent page scrolling
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeKidId, manualAvatarIds]);

  useEffect(() => {
    if (!familyId || kids.length === 0) return;
    const batch = writeBatch(db);
    let hasUpdates = false;
    kids.forEach((kid) => {
      const earned = kid.cashAchievements ?? [];
      const earnedSet = new Set(earned);
      const items = itemsByKid[kid.id] ?? [];
      const counts = items.reduce<Record<string, number>>((acc, item) => {
        acc[item.itemId] = (acc[item.itemId] ?? 0) + 1;
        return acc;
      }, {});
      const newlyEarned: string[] = [];
      let cashReward = 0;
      CASH_ACHIEVEMENTS.forEach((achievement) => {
        if ((counts[achievement.itemId] ?? 0) >= achievement.requiredCount && !earnedSet.has(achievement.id)) {
          newlyEarned.push(achievement.id);
          cashReward += achievement.cashReward;
        }
      });
      if (newlyEarned.length > 0) {
        batch.update(doc(db, 'kids', kid.id), {
          cashBalance: increment(cashReward),
          cashAchievements: arrayUnion(...newlyEarned)
        });
        hasUpdates = true;
      }
    });
    if (hasUpdates) {
      batch.commit().then(() => {
        showToast('New cash reward unlocked!', 'success');
      }).catch(() => {
        showToast('Unable to save cash rewards.', 'warning');
      });
    }
  }, [familyId, kids, itemsByKid, showToast]);

  useEffect(() => {
    kids.forEach((kid) => {
      const container = mapScrollRefs.current[kid.id];
      if (!container) return;
      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 40;
      if (nearBottom || !mapHasAutoScrolled.current[kid.id]) {
        container.scrollTop = container.scrollHeight;
        mapHasAutoScrolled.current[kid.id] = true;
      }
    });
  }, [kids, logs]);

  const getLogActionLabel = (log: Log) =>
    getActionLabels(
      actions,
      log.actionTypes,
      log.actionLabels,
      log.actionType ? getActionLabel(actions, log.actionType, log.actionLabel) : log.actionLabel
    );

  const getLogPrimaryAction = (log: Log) => log.actionType ?? log.actionTypes?.[0];

  const getLogFoodLabel = (log: Log) => {
    const labels = log.foodLabels?.length
      ? log.foodLabels
      : log.foodLabel
      ? [log.foodLabel]
      : log.foodName
      ? [log.foodName]
      : [];
    return labels.length > 0 ? labels.join(' + ') : null;
  };

  const formatItemTooltip = (item: ForestItem) => {
    const catalog = getForestItemById(item.itemId);
    const log = item.sourceLogId ? logsById.get(item.sourceLogId) : undefined;
    if (!log) {
      return catalog ? `${catalog.name} • Purchased with points` : 'Forest item';
    }
    const countryName = getCountryByCode(log.countryCode)?.name;
    const extras = [
      getLogFoodLabel(log),
      countryName,
      log.mealType ? getMealLabel(meals, log.mealType, log.mealLabel) : null,
      log.mealCompletion ? getCompletionLabel(completions, log.mealCompletion, log.completionLabel) : null
    ]
      .filter(Boolean)
      .join(' • ');
    const dateLabel = log.createdAt?.toDate().toLocaleDateString() ?? 'Just now';
    return `${catalog?.name ?? 'Forest item'} · ${getLogActionLabel(log)}${extras ? ` • ${extras}` : ''} · ${dateLabel}`;
  };

  const decorateItems = (items: ForestItem[]) =>
    items.map((item) => ({
      ...item,
      tooltip: formatItemTooltip(item)
    }));

  const kidsWithItems = useMemo(() => {
    return kids.map((kid) => ({
      ...kid,
      items: decorateItems(itemsByKid[kid.id] ?? [])
    }));
  }, [kids, itemsByKid, logsById]);

  useEffect(() => {
    if (kids.length === 0) {
      setActiveKidId('');
      return;
    }
    if (!activeKidId || !kids.some((kid) => kid.id === activeKidId)) {
      setActiveKidId(kids[0].id);
    }
  }, [activeKidId, kids]);

  const activeKid = useMemo(
    () => kidsWithItems.find((kid) => kid.id === activeKidId) ?? kidsWithItems[0],
    [kidsWithItems, activeKidId]
  );

  const familyAvatars = useMemo(() => {
    const kidAvatars = kidsWithItems.map((kid) => kid.avatar);
    return ['character', ...kidAvatars] as Kid['avatar'][];
  }, [kidsWithItems]);

  const familyAvatarPositions = [
    { top: '32%', left: '46%', delay: '0s' },
    { top: '42%', left: '58%', delay: '1.2s' },
    { top: '50%', left: '38%', delay: '2.4s' },
    { top: '28%', left: '60%', delay: '3.6s' },
    { top: '56%', left: '52%', delay: '4.8s' }
  ];

  const careActions = [
    { id: 'feed', label: 'Feed', stat: 'hunger', icon: Utensils, delta: 12, bubble: '😋', bubbleScale: 1.4 },
    { id: 'clean', label: 'Clean', stat: 'cleanliness', icon: Sparkles, delta: 12, bubble: '✨', bubbleScale: 1.9 },
    { id: 'refresh', label: 'Refresh', stat: 'hydration', icon: CupSoda, delta: 12, bubble: '💧', bubbleScale: 1.5 },
    { id: 'highfive', label: 'High-five', stat: 'social', icon: HandHeart, delta: 12, bubble: '🙌', bubbleScale: 1.4 },
    { id: 'play', label: 'Play', stat: 'fun', icon: Gamepad2, delta: 12, bubble: '🎉', bubbleScale: 1.6 },
    { id: 'nap', label: 'Nap', stat: 'energy', icon: Moon, delta: 12, bubble: '💤', bubbleScale: 1.6 },
    { id: 'explore', label: 'Explore', stat: 'curiosity', icon: Compass, delta: 12, bubble: '🧭', bubbleScale: 1.5 },
    { id: 'decorate', label: 'Decorate', stat: 'creativity', icon: Paintbrush, delta: 12, bubble: '🎨', bubbleScale: 1.6 }
  ] as const;

  const familyDecoratedItems = useMemo(() => decorateItems(familyItems), [familyItems, logsById]);

  const mosaicTiles = useMemo(() => {
    const [firstKid, secondKid, ...rest] = kidsWithItems;
    const tiles = [
      {
        id: firstKid?.id ?? 'kid-a',
        label: firstKid?.name ?? (kidsWithItems.length === 0 ? 'Add a kid' : 'Kid'),
        items: firstKid?.items ?? []
      },
      {
        id: secondKid?.id ?? 'kid-b',
        label: secondKid?.name ?? (kidsWithItems.length < 2 ? 'Open plot' : 'Kid'),
        items: secondKid?.items ?? []
      },
      {
        id: 'parents',
        label: 'Parents',
        items: familyDecoratedItems
      }
    ];
    return { tiles, extraKids: rest };
  }, [kidsWithItems, familyDecoratedItems]);

  const actionSummary = useMemo(() => {
    const counts = actions.reduce((acc, action) => {
      acc[action.id] = 0;
      return acc;
    }, {} as Record<string, number>);
    logs.forEach((log) => {
      const actionIds = log.actionTypes?.length ? log.actionTypes : log.actionType ? [log.actionType] : [];
      actionIds.forEach((actionId) => {
        counts[actionId] = (counts[actionId] ?? 0) + 1;
      });
    });
    return { counts };
  }, [actions, logs]);

  const totalItemsPlaced = useMemo(() => {
    const kidsTotal = kidsWithItems.reduce((sum, kid) => sum + kid.items.length, 0);
    return kidsTotal + familyDecoratedItems.length;
  }, [kidsWithItems, familyDecoratedItems.length]);

  const totalPointsSpent = useMemo(() => {
    const kidsSpent = kidsWithItems.reduce(
      (sum, kid) => sum + kid.items.reduce((kidSum, item) => kidSum + item.cost, 0),
      0
    );
    const familySpent = familyDecoratedItems.reduce((sum, item) => sum + item.cost, 0);
    return kidsSpent + familySpent;
  }, [kidsWithItems, familyDecoratedItems]);

  const travelMarkers = family.unlockedCountries ?? [];
  const visibleMarkers = travelMarkers.slice(0, 6);
  const extraMarkerCount = travelMarkers.length - visibleMarkers.length;

  const kidSlots = getSlotsForSize('kid');

  const getZoom = (key: string) => zoomLevels[key] ?? 1;
  const getPan = (key: string) => panOffsets[key] ?? { x: 0, y: 0 };
  const getPanBounds = (key: string, zoomOverride?: number) => {
    const container = panContainerRefs.current[key];
    const content = panContentRefs.current[key];
    if (!container || !content) return { maxX: 0, maxY: 0 };
    const zoom = zoomOverride ?? getZoom(key);
    const contentRect = content.getBoundingClientRect();
    const baseWidth = contentRect.width / zoom;
    const baseHeight = contentRect.height / zoom;
    const containerRect = container.getBoundingClientRect();
    const scaledWidth = baseWidth * zoom;
    const scaledHeight = baseHeight * zoom;
    return {
      maxX: Math.max(0, (scaledWidth - containerRect.width) / 2),
      maxY: Math.max(0, (scaledHeight - containerRect.height) / 2)
    };
  };
  const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
  const updateZoom = (key: string, delta: number) => {
    const nextValue = clampZoom(getZoom(key) + delta);
    setZoomLevels((prev) => ({ ...prev, [key]: nextValue }));
    setPanOffsets((prev) => {
      if (nextValue <= PAN_THRESHOLD) {
        return { ...prev, [key]: { x: 0, y: 0 } };
      }
      const bounds = getPanBounds(key, nextValue);
      const current = prev[key] ?? { x: 0, y: 0 };
      return {
        ...prev,
        [key]: {
          x: Math.max(-bounds.maxX, Math.min(bounds.maxX, current.x)),
          y: Math.max(-bounds.maxY, Math.min(bounds.maxY, current.y))
        }
      };
    });
  };

  const handlePanStart = (key: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const zoom = getZoom(key);
    if (zoom <= PAN_THRESHOLD) return;
    const bounds = getPanBounds(key, zoom);
    const origin = getPan(key);
    panState.current = {
      key,
      startX: event.clientX,
      startY: event.clientY,
      origin,
      maxX: bounds.maxX,
      maxY: bounds.maxY
    };
    setActivePanKey(key);
    event.preventDefault();
  };

  const triggerBubble = (kidId: string, message: string, scale = 1.4) => {
    if (!kidId) return;
    const token = Date.now();
    setBubbleOverrides((prev) => ({
      ...prev,
      [kidId]: {
        message,
        token,
        expiresAt: token + 3200,
        scale
      }
    }));
    if (bubbleTimeouts.current[kidId]) {
      window.clearTimeout(bubbleTimeouts.current[kidId]);
    }
    bubbleTimeouts.current[kidId] = window.setTimeout(() => {
      setBubbleOverrides((prev) => {
        const next = { ...prev };
        delete next[kidId];
        return next;
      });
    }, 3200);
  };

  const renderZoomControls = (key: string) => {
    const zoom = getZoom(key);
    return (
      <div className="absolute right-2 top-2 z-10 flex gap-2 rounded-full border border-mist-200 bg-white/90 p-1 shadow-sm transition-opacity opacity-80 hover:opacity-100">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-50 text-xs font-semibold text-pine-900 transition hover:bg-mist-100 disabled:opacity-40"
          onClick={() => updateZoom(key, -ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM + 0.001}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-50 text-xs font-semibold text-pine-900 transition hover:bg-mist-100 disabled:opacity-40"
          onClick={() => updateZoom(key, ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM - 0.001}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    );
  };

  const getTargetSnapshot = (target: StoreTarget) => {
    const ownerType = target.type;
    const ownerId = ownerType === 'kid' ? target.kid.id : familyId ?? '';
    const ownerPoints = ownerType === 'kid' ? target.kid.points : family.totalPoints;
    const ownerItems = ownerType === 'kid' ? itemsByKid[ownerId] ?? [] : familyItems;
    return { ownerType, ownerId, ownerPoints, ownerItems };
  };

  const handleOpenStore = (target: StoreTarget) => {
    if (placement) {
      showToast('Finish placing your item or cancel before opening another store.', 'warning');
      return;
    }
    if (relocation) {
      showToast('Finish relocating your item or cancel before opening the store.', 'warning');
      return;
    }
    setStoreTarget(target);
  };

  const handleStartPlacement = (item: ForestCatalogItem, sourceLogId?: string) => {
    if (!familyId || !storeTarget) return;
    if (relocation) {
      showToast('Finish relocating your item or cancel before placing a new one.', 'warning');
      return;
    }

    const { ownerPoints, ownerItems } = getTargetSnapshot(storeTarget);
    const spentPoints = ownerItems.reduce((sum, current) => sum + current.cost, 0);
    const availablePoints = ownerPoints - spentPoints;

    if (availablePoints < item.cost) {
      showToast('Not enough points yet. Keep logging meals!', 'warning');
      return;
    }

    if (ownerItems.length >= kidSlots.length) {
      showToast('Island is full. Remove an item to make space.', 'warning');
      return;
    }

    setPlacement({ item, sourceLogId, target: storeTarget });
    setStoreTarget(null);
  };

  const handlePlacementSelect = async (slotIndex: number) => {
    if (!familyId || !placement) return;
    const { item, sourceLogId, target } = placement;
    const { ownerType, ownerId, ownerPoints, ownerItems } = getTargetSnapshot(target);
    if (!ownerId) return;

    const spentPoints = ownerItems.reduce((sum, current) => sum + current.cost, 0);
    const availablePoints = ownerPoints - spentPoints;

    if (availablePoints < item.cost) {
      showToast('Not enough points to place this item.', 'warning');
      return;
    }

    if (ownerItems.length >= kidSlots.length) {
      showToast('Island is full. Remove an item to make space.', 'warning');
      return;
    }

    if (ownerItems.some((existing) => existing.slotIndex === slotIndex)) {
      showToast('That spot is already taken. Choose another.', 'warning');
      return;
    }

    const docRef = collection(
      db,
      ownerType === 'kid' ? 'kids' : 'families',
      ownerId,
      'forestItems'
    );

    const payload: Record<string, unknown> = {
      familyId,
      itemId: item.id,
      cost: item.cost,
      slotIndex,
      createdAt: serverTimestamp()
    };

    if (sourceLogId) {
      payload.sourceLogId = sourceLogId;
    }

    try {
      await addDoc(docRef, payload);
      showToast(`${item.name} added to the forest!`, 'success');
      setPlacement(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add item to the forest.';
      showToast(message, 'warning');
    }
  };

  const handleCancelPlacement = () => {
    if (!placement) return;
    setPlacement(null);
  };

  const handleStartRelocation = (item: ForestItem, target: StoreTarget) => {
    if (placement) {
      showToast('Finish placing your item or cancel before moving another.', 'warning');
      return;
    }
    if (storeTarget) {
      showToast('Close the store before moving items.', 'warning');
      return;
    }
    setRelocation((prev) => {
      if (prev?.item.id === item.id) return null;
      return { item, target };
    });
  };

  const handleCancelRelocation = () => {
    if (!relocation) return;
    setRelocation(null);
  };

  const handleRelocationSelect = async (slotIndex: number) => {
    if (!familyId || !relocation) return;
    const { item, target } = relocation;
    const { ownerType, ownerId, ownerItems } = getTargetSnapshot(target);
    if (!ownerId) return;

    if (ownerItems.some((existing) => existing.slotIndex === slotIndex && existing.id !== item.id)) {
      showToast('That spot is already taken. Choose another.', 'warning');
      return;
    }

    try {
      const itemRef = doc(
        db,
        ownerType === 'kid' ? 'kids' : 'families',
        ownerId,
        'forestItems',
        item.id
      );
      await updateDoc(itemRef, {
        slotIndex
      });
      showToast('Item moved!', 'success');
      setRelocation(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to move the item.';
      showToast(message, 'warning');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!familyId || !storeTarget) return;
    const ownerType = storeTarget.type;
    const ownerId = ownerType === 'kid' ? storeTarget.kid.id : familyId;
    const itemRef = doc(
      db,
      ownerType === 'kid' ? 'kids' : 'families',
      ownerId,
      'forestItems',
      itemId
    );
    await deleteDoc(itemRef);
    showToast('Item removed. Points refunded.', 'success');
  };

  const handleAvatarUpdate = async (kidId: string, avatar: Kid['avatar']) => {
    if (!kidId) return;
    setSavingAvatar(true);
    try {
      await updateDoc(doc(db, 'kids', kidId), {
        avatar
      });
      showToast('Avatar updated!', 'success');
      setAvatarModalKid(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update avatar.';
      showToast(message, 'warning');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleCareAction = async (kid: Kid, action: (typeof careActions)[number]) => {
    if (!kid.id) return;
    const current = getDecayedCareStats(kid.careStats ?? DEFAULT_CARE_STATS, new Date());
    const nextValue = clampCareStat(current[action.stat] + action.delta);
    const nextStats = {
      ...current,
      [action.stat]: nextValue,
      updatedAt: serverTimestamp()
    };
    try {
      await updateDoc(doc(db, 'kids', kid.id), {
        careStats: nextStats
      });
      showToast(`${action.label} complete!`, 'success');
      triggerBubble(kid.id, action.bubble, action.bubbleScale);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update care stats.';
      showToast(message, 'warning');
    }
  };

  const handleDeleteLog = async (log: Log) => {
    if (!familyId) return;
    if (!canDeleteLogs) return;
    const kid = kidsWithItems.find((item) => item.id === log.kidId);
    if (!kid) return;
    const confirmed = window.confirm('Delete this log? This will remove points and may remove forest items.');
    if (!confirmed) return;

    setDeletingLogId(log.id);
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
      setDeletingLogId(null);
    }
  };

  const renderKidCard = (kid: Kid, items: ForestIslandItem[]) => {
    const spent = items.reduce((sum, item) => sum + item.cost, 0);
    const available = Math.max(0, kid.points - spent);
    const isPlacementTarget = placement?.target.type === 'kid' && placement.target.kid.id === kid.id;
    const isRelocationTarget = relocation?.target.type === 'kid' && relocation.target.kid.id === kid.id;
    const relocationItem = isRelocationTarget ? relocation.item : null;
    const filledSlots = items
      .map((item) => item.slotIndex)
      .filter((slot): slot is number => Number.isFinite(slot));
    const relocationFilledSlots =
      relocationItem && Number.isFinite(relocationItem.slotIndex)
        ? filledSlots.filter((slot) => slot !== relocationItem.slotIndex)
        : filledSlots;
    const zoomKey = kid.id;
    const zoom = getZoom(zoomKey);
    const pan = getPan(zoomKey);
    const canPan = zoom > PAN_THRESHOLD && !isPlacementTarget && !isRelocationTarget;
    const manualAvatarEnabled = manualAvatarIds[kid.id] ?? false;
    const kidLogs = [...(logsByKidId.get(kid.id) ?? [])].reverse();
    const effectiveCareStats = getDecayedCareStats(kid.careStats ?? DEFAULT_CARE_STATS, now);
    const bubbleOverride = bubbleOverrides[kid.id];
    const bubbleMessage =
      bubbleOverride && bubbleOverride.expiresAt > now.getTime() ? bubbleOverride.message : undefined;
    const bubbleToken =
      bubbleOverride && bubbleOverride.expiresAt > now.getTime() ? bubbleOverride.token.toString() : undefined;
    const bubbleScale =
      bubbleOverride && bubbleOverride.expiresAt > now.getTime() ? bubbleOverride.scale : undefined;
    const relocationLabel = relocationItem ? getForestItemById(relocationItem.itemId)?.name : null;
    const mapStep = 84;
    const mapPadding = 36;
    const mapHeight = Math.max(280, mapPadding * 2 + kidLogs.length * mapStep);
    const mapPathHeight = Math.max(200, mapHeight - 24);
    const buildPath = (height: number) => {
      const segment = 120;
      let d = `M24 0`;
      let y = 0;
      let direction = 1;
      while (y < height) {
        const nextY = Math.min(y + segment, height);
        const cp1x = direction > 0 ? 44 : 6;
        const cp2x = direction > 0 ? 6 : 44;
        d += ` C ${cp1x} ${y + segment * 0.35}, ${cp2x} ${y + segment * 0.7}, 24 ${nextY}`;
        y = nextY;
        direction *= -1;
      }
      return d;
    };
    const pathD = buildPath(mapPathHeight);
    const cloudStops = [0.1, 0.32, 0.55, 0.78].map((ratio, index) => ({
      key: `${kid.id}-cloud-${index}`,
      top: Math.max(24, mapHeight * ratio),
      left: index % 2 === 0 ? 60 : 140
    }));
    const trailLogs = kidLogs;

    return (
      <div key={kid.id} className="card card-scenic-kid p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg text-pine-900">{kid.name}'s forest</h3>
              <span className="inline-flex items-center gap-2 rounded-full bg-sun-100 px-3 py-1 text-xs font-semibold text-sun-900">
                <span>✨</span>
                <span>{kid.points} pts</span>
              </span>
            </div>
            <p className="text-sm text-mist-600">
              {available} points available • {items.length}/{kidSlots.length} items placed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {renderZoomControls(zoomKey)}
            <button
              className="btn-ghost"
              type="button"
              onClick={() =>
                setManualAvatarIds((prev) => ({ ...prev, [kid.id]: !manualAvatarEnabled }))
              }
            >
              {manualAvatarEnabled ? 'Auto wander' : 'Control avatar'}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setAvatarModalKid(kid)}
            >
              Change avatar
            </button>
            <Link className="btn-ghost" to="/app/rewards">
              Cash out
            </Link>
            <button className="btn-primary" type="button" onClick={() => handleOpenStore({ type: 'kid', kid })}>
              Open store
            </button>
          </div>
        </div>
        {isPlacementTarget && placement ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sun-200 bg-sun-50 px-3 py-2 text-xs font-semibold text-pine-900">
            <span>Select a spot for {placement.item.name}. Click a glowing tile.</span>
            <button type="button" className="btn-ghost text-xs" onClick={handleCancelPlacement}>
              Cancel placement
            </button>
          </div>
        ) : isRelocationTarget && relocationItem ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sun-200 bg-sun-50 px-3 py-2 text-xs font-semibold text-pine-900">
            <span>Relocating {relocationLabel ?? 'item'}. Click a glowing tile.</span>
            <button type="button" className="btn-ghost text-xs" onClick={handleCancelRelocation}>
              Cancel move
            </button>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-mist-200 bg-white/80 p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-pine-900">Care stats</p>
              <span className="rounded-full bg-moss-100 px-2 py-1 text-[11px] font-semibold text-pine-900">
                Tamagotchi mode
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {([
                { key: 'hunger', label: 'Fed' },
                { key: 'cleanliness', label: 'Clean' },
                { key: 'hydration', label: 'Refreshed' },
                { key: 'social', label: 'Social' },
                { key: 'fun', label: 'Fun' },
                { key: 'energy', label: 'Rested' },
                { key: 'curiosity', label: 'Curious' },
                { key: 'creativity', label: 'Creative' }
              ] as const).map((stat) => {
                const value = effectiveCareStats[stat.key];
                let colorClass = 'bg-green-500';
                if (value <= 25) colorClass = 'bg-red-500';
                else if (value <= 50) colorClass = 'bg-orange-500';
                else if (value <= 75) colorClass = 'bg-yellow-400';

                return (
                  <div key={stat.key}>
                    <div className="flex items-center justify-between text-[11px] text-mist-600">
                      <span>{stat.label}</span>
                      <span className="font-semibold text-pine-900">{value}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-mist-200">
                      <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-mist-200 bg-white/80 p-4 shadow-soft">
            <p className="text-sm font-semibold text-pine-900">Care actions</p>
            <p className="text-xs text-mist-600">Tap to boost stats.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {careActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    className="flex items-center gap-2 rounded-xl border border-mist-200 bg-white/80 px-3 py-2 text-xs font-semibold text-pine-900 hover:bg-mist-100"
                    onClick={() => handleCareAction(kid, action)}
                  >
                    <Icon className="h-4 w-4 text-moss-700" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.9fr] lg:items-start">
          <div
            ref={(node) => {
              panContainerRefs.current[zoomKey] = node;
            }}
            className="relative self-start overflow-hidden rounded-2xl border border-mist-200 bg-white/70"
            onPointerDown={(event) => {
              const target = event.target as Element | null;
              if (target?.closest?.('[data-forest-item],[data-forest-avatar]')) return;
              if (!canPan) return;
              handlePanStart(zoomKey, event);
            }}
            style={{
              cursor: canPan ? (activePanKey === zoomKey ? 'grabbing' : 'grab') : 'default',
              touchAction: canPan ? 'none' : 'auto'
            }}
          >
            {renderZoomControls(zoomKey)}
            <div style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
              <div
                ref={(node) => {
                  panContentRefs.current[zoomKey] = node;
                }}
                className="transition-transform duration-300"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
              >
                <ForestIslandSvg
                  items={items}
                  size="kid"
                  compact={isCompact}
                  className="h-auto w-full"
                  characterAvatar={kid.avatar}
                  bubbleMessage={bubbleMessage}
                  bubbleKey={bubbleToken}
                  bubbleScale={bubbleScale}
                  initialPosition={manualAvatarPositions[kid.id]}
                  manualAvatar={{
                    enabled: manualAvatarEnabled,
                    position: manualAvatarPositions[kid.id],
                    onChange: (position) =>
                      setManualAvatarPositions((prev) => ({ ...prev, [kid.id]: position }))
                  }}
                  placement={
                    isPlacementTarget
                      ? {
                          active: true,
                          filledSlots,
                        onSelect: handlePlacementSelect
                      }
                    : isRelocationTarget && relocationItem
                    ? {
                        active: true,
                        filledSlots: relocationFilledSlots,
                        onSelect: handleRelocationSelect
                      }
                    : undefined
                }
                onItemSelect={(item) => handleStartRelocation(item, { type: 'kid', kid })}
                selectedItemId={relocationItem?.id}
              />
            </div>
          </div>
          </div>

          <div className="rounded-2xl border border-mist-200 bg-white/80 p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-pine-900">Adventure map</h4>
              <span className="rounded-full bg-moss-100 px-2 py-1 text-[11px] font-semibold text-pine-900">
                {kidLogs.length} stops
              </span>
            </div>
            <div className="relative mt-4 rounded-2xl border border-mist-200 bg-white/70">
              <div
                ref={(node) => {
                  mapScrollRefs.current[kid.id] = node;
                }}
                className="map-scroll relative h-80 overflow-y-auto rounded-2xl"
              >
                <div className="map-canvas relative w-full" style={{ height: mapHeight }}>
                  <svg
                    className="absolute left-3 top-3"
                    width={60}
                    height={mapPathHeight}
                    viewBox={`0 0 60 ${mapPathHeight}`}
                    aria-hidden="true"
                  >
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#6dc888"
                      strokeWidth={6}
                      strokeLinecap="round"
                      strokeDasharray="10 10"
                    />
                  </svg>
                  {cloudStops.map((cloud) => (
                    <Cloud
                      key={cloud.key}
                      className="map-cloud absolute h-7 w-7 text-white/80"
                      style={{ top: cloud.top, left: cloud.left }}
                    />
                  ))}
                  {trailLogs.length === 0 ? (
                    <p className="absolute left-16 top-8 text-xs text-mist-600">
                      No highlights yet. Log a meal to start the trail!
                    </p>
                  ) : (
                    trailLogs.map((log, index) => {
                      const actionLabel = getLogActionLabel(log);
                      const foodLabel = getLogFoodLabel(log);
                      const primaryAction = getLogPrimaryAction(log);
                      const Icon = primaryAction ? ACTION_ICONS[primaryAction] ?? Sparkles : Sparkles;
                      const dateLabel = log.createdAt?.toDate().toLocaleDateString() ?? 'Just now';
                      const top = mapPadding + index * mapStep;
                      const offset = index % 2 === 0 ? 0 : 16;
                      return (
                        <div
                          key={log.id}
                          className="absolute flex items-center gap-3"
                          style={{ top, left: 48 + offset }}
                        >
                          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-mist-200 bg-white text-moss-700 shadow-soft">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="rounded-2xl border-2 border-mist-200 bg-white/80 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-pine-900">
                                {actionLabel}
                                {foodLabel ? ` • ${foodLabel}` : ''}
                              </p>
                              {canDeleteLogs ? (
                                <button
                                  type="button"
                                  className="rounded-full border border-mist-200 bg-white/80 p-1 text-mist-500 transition hover:bg-mist-100 hover:text-pine-900 disabled:opacity-60"
                                  onClick={() => handleDeleteLog(log)}
                                  disabled={deletingLogId === log.id}
                                  aria-label="Delete log"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-mist-600">{dateLabel}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {trailLogs.length > 0 ? (
                    <Flag
                      className="absolute h-6 w-6 text-sun-500"
                      style={{ top: mapPadding - 12, left: 18 }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-mist-600">The trail keeps going as they log more meals.</div>
          </div>
        </div>
      </div>
    );
  };

  const parentsSpent = familyDecoratedItems.reduce((sum, item) => sum + item.cost, 0);
  const parentsAvailable = Math.max(0, family.totalPoints - parentsSpent);
  const parentsPlacementActive = placement?.target.type === 'family';
  const parentsRelocationActive = relocation?.target.type === 'family';
  const relocationFamilyItem = parentsRelocationActive ? relocation.item : null;
  const parentsFilledSlots = familyDecoratedItems
    .map((item) => item.slotIndex)
    .filter((slot): slot is number => Number.isFinite(slot));
  const parentsRelocationFilledSlots =
    relocationFamilyItem && Number.isFinite(relocationFamilyItem.slotIndex)
      ? parentsFilledSlots.filter((slot) => slot !== relocationFamilyItem.slotIndex)
      : parentsFilledSlots;
  const parentsZoomKey = 'parents';
  const parentsZoom = getZoom(parentsZoomKey);
  const parentsPan = getPan(parentsZoomKey);
  const parentsCanPan = parentsZoom > PAN_THRESHOLD && !parentsPlacementActive && !parentsRelocationActive;
  const mosaicZoomKey = 'family-mosaic';
  const mosaicZoom = getZoom(mosaicZoomKey);
  const mosaicPan = getPan(mosaicZoomKey);
  const mosaicCanPan = mosaicZoom > PAN_THRESHOLD;

  return (
    <div className="space-y-8 py-6">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-pine-900">Choose an explorer</h3>
            <p className="text-xs text-mist-600">Tap a kid to view their forest.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {kidsWithItems.map((kid) => {
            const isActive = kid.id === activeKid?.id;
            return (
              <button
                key={kid.id}
                type="button"
                onClick={() => setActiveKidId(kid.id)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-moss-300 bg-moss-100 text-pine-900 shadow-soft'
                    : 'border-mist-200 bg-white/80 text-mist-700 hover:bg-mist-100'
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-soft">
                  <AvatarIcon avatar={kid.avatar} size={24} />
                </span>
                {kid.name}
              </button>
            );
          })}
          {kidsWithItems.length === 0 ? (
            <span className="text-sm text-mist-600">Add a kid to start their forest.</span>
          ) : null}
        </div>
      </div>

      {activeKid ? (
        renderKidCard(activeKid, activeKid.items)
      ) : (
        <div className="card p-6 text-sm text-mist-600">Add a kid first to start their forest.</div>
      )}

      <div className="card card-scenic-forest p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl text-pine-900">Family forest mosaic</h2>
            <p className="text-sm text-mist-600">
              Each kid shapes their own island. Together they form the family forest.
            </p>
          </div>
          <div className="rounded-full bg-moss-100 px-4 py-2 text-xs font-semibold text-pine-900">
            Total points: {family.totalPoints}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div
            ref={(node) => {
              panContainerRefs.current[mosaicZoomKey] = node;
            }}
            className="relative rounded-3xl border border-mist-200 bg-white/70 shadow-soft overflow-hidden"
            onPointerDown={(event) => {
              if (!mosaicCanPan) return;
              handlePanStart(mosaicZoomKey, event);
            }}
            style={{
              cursor: mosaicCanPan ? (activePanKey === mosaicZoomKey ? 'grabbing' : 'grab') : 'default',
              touchAction: mosaicCanPan ? 'none' : 'auto'
            }}
          >
            {renderZoomControls(mosaicZoomKey)}
            <div style={{ transform: `translate(${mosaicPan.x}px, ${mosaicPan.y}px)` }}>
              <div
                ref={(node) => {
                  panContentRefs.current[mosaicZoomKey] = node;
                }}
                className="relative transition-transform duration-300"
                style={{ transform: `scale(${mosaicZoom})`, transformOrigin: 'center' }}
              >
                <FamilyLIslandSvg tiles={mosaicTiles.tiles} className="h-auto w-full" />
                <div className="pointer-events-none absolute inset-0">
                  {familyAvatars.map((avatar, index) => {
                    const position = familyAvatarPositions[index % familyAvatarPositions.length];
                    return (
                      <div
                        key={`${avatar}-${index}`}
                        className="family-avatar pointer-events-auto"
                        style={{ top: position.top, left: position.left, animationDelay: position.delay }}
                      >
                        <span className="avatar-chat">...</span>
                        <AvatarIcon avatar={avatar} size={36} className="object-contain" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <details className="group rounded-2xl border border-mist-200 bg-white/70 px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span className="text-xs font-semibold text-pine-900">Family forest stats</span>
              <span className="text-xs text-mist-500">Expand</span>
            </summary>
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-moss-100 px-3 py-1 text-xs font-semibold text-pine-900">
                  Meals logged: {logs.length}
                </span>
                <span className="rounded-full bg-moss-100 px-3 py-1 text-xs font-semibold text-pine-900">
                  Points earned: {family.totalPoints}
                </span>
              {Object.entries(actionSummary.counts)
                .filter(([, count]) => count > 0)
                .map(([actionId, count]) => (
                <span
                  key={actionId}
                  className="rounded-full border border-mist-200 bg-white/80 px-3 py-1 text-xs font-semibold text-pine-900"
                >
                  {getActionLabel(actions, actionId)}: {count}
                </span>
              ))}
                <span className="rounded-full border border-mist-200 bg-white/80 px-3 py-1 text-xs font-semibold text-pine-900">
                  Items placed: {totalItemsPlaced}
                </span>
                <span className="rounded-full border border-mist-200 bg-white/80 px-3 py-1 text-xs font-semibold text-pine-900">
                  Points spent: {totalPointsSpent}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-mist-600">Travel markers</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleMarkers.length > 0 ? (
                    visibleMarkers.map((code) => {
                      const country = getCountryByCode(code);
                      return (
                        <span
                          key={code}
                          className="rounded-full border border-mist-200 bg-white/70 px-3 py-1 text-xs font-semibold text-pine-900"
                          title={country?.name ?? code}
                        >
                          {country?.flag ?? '🌍'} {code}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-mist-600">
                      No travel markers yet. Log an international bite.
                    </span>
                  )}
                  {extraMarkerCount > 0 ? (
                    <span className="rounded-full bg-moss-100 px-3 py-1 text-xs font-semibold text-pine-900">
                      +{extraMarkerCount} more
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {mosaicTiles.tiles.map((tile) => (
                  <span
                    key={tile.id}
                    className="rounded-full border border-mist-200 bg-white/80 px-3 py-1 text-xs font-semibold text-pine-900"
                  >
                    {tile.label} • {tile.items.length} items
                  </span>
                ))}
                {mosaicTiles.extraKids.length > 0 ? (
                  <span className="rounded-full border border-mist-200 bg-white/80 px-3 py-1 text-xs font-semibold text-pine-900">
                    +{mosaicTiles.extraKids.length} more kid islands
                  </span>
                ) : null}
              </div>
            </div>
          </details>
        </div>
      </div>

      <details className="group card card-scenic-kid p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <h3 className="text-lg text-pine-900">Parents forest</h3>
            <p className="text-sm text-mist-600">
              {parentsAvailable} points available • {familyDecoratedItems.length}/{kidSlots.length} items placed
            </p>
          </div>
          <span className="text-xs text-mist-500">Expand</span>
        </summary>
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {renderZoomControls(parentsZoomKey)}
            <button className="btn-primary" type="button" onClick={() => handleOpenStore({ type: 'family' })}>
              Open store
            </button>
          </div>
        </div>
        {parentsPlacementActive && placement ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sun-200 bg-sun-50 px-3 py-2 text-xs font-semibold text-pine-900">
            <span>Select a spot for {placement.item.name}. Click a glowing tile.</span>
            <button type="button" className="btn-ghost text-xs" onClick={handleCancelPlacement}>
              Cancel placement
            </button>
          </div>
        ) : parentsRelocationActive && relocationFamilyItem ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sun-200 bg-sun-50 px-3 py-2 text-xs font-semibold text-pine-900">
            <span>
              Relocating {getForestItemById(relocationFamilyItem.itemId)?.name ?? 'item'}. Click a glowing tile.
            </span>
            <button type="button" className="btn-ghost text-xs" onClick={handleCancelRelocation}>
              Cancel move
            </button>
          </div>
        ) : null}
        <div className="mt-4">
          <div
            ref={(node) => {
              panContainerRefs.current[parentsZoomKey] = node;
            }}
            className="relative overflow-hidden rounded-2xl border border-mist-200 bg-white/60"
            onPointerDown={(event) => {
              const target = event.target as Element | null;
              if (target?.closest?.('[data-forest-item],[data-forest-avatar]')) return;
              if (!parentsCanPan) return;
              handlePanStart(parentsZoomKey, event);
            }}
            style={{
              cursor: parentsCanPan ? (activePanKey === parentsZoomKey ? 'grabbing' : 'grab') : 'default',
              touchAction: parentsCanPan ? 'none' : 'auto'
            }}
          >
            <div style={{ transform: `translate(${parentsPan.x}px, ${parentsPan.y}px)` }}>
              <div
                ref={(node) => {
                  panContentRefs.current[parentsZoomKey] = node;
                }}
                className="transition-transform duration-300"
                style={{ transform: `scale(${parentsZoom})`, transformOrigin: 'center' }}
              >
                <ForestIslandSvg
                  items={familyDecoratedItems}
                  size="kid"
                  compact={isCompact}
                  className="h-auto w-full"
                  placement={
                    parentsPlacementActive
                      ? {
                          active: true,
                          filledSlots: parentsFilledSlots,
                          onSelect: handlePlacementSelect
                        }
                      : parentsRelocationActive && relocationFamilyItem
                      ? {
                          active: true,
                          filledSlots: parentsRelocationFilledSlots,
                          onSelect: handleRelocationSelect
                        }
                      : undefined
                  }
                  onItemSelect={(item) => handleStartRelocation(item, { type: 'family' })}
                  selectedItemId={relocationFamilyItem?.id}
                />
              </div>
            </div>
          </div>
        </div>
      </details>

      {avatarModalKid ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-pine-900/40 px-4 py-6"
          onClick={(event) => {
            if (event.target === event.currentTarget && !savingAvatar) {
              setAvatarModalKid(null);
            }
          }}
        >
          <div className="card w-full max-w-3xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg text-pine-900">Choose a new avatar</h3>
                <p className="text-sm text-mist-600">For {avatarModalKid.name}</p>
              </div>
              <button
                className="btn-ghost text-xs"
                type="button"
                onClick={() => setAvatarModalKid(null)}
                disabled={savingAvatar}
              >
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AVATAR_OPTIONS.map((option) => {
                const isSelected = avatarModalKid.avatar === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-moss-300 bg-moss-100 text-pine-900 shadow-soft'
                        : 'border-mist-200 bg-white/80 text-mist-700 hover:bg-mist-100'
                    }`}
                    onClick={() => handleAvatarUpdate(avatarModalKid.id, option.id)}
                    disabled={savingAvatar}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-soft">
                      <AvatarIcon avatar={option.id} size={32} />
                    </span>
                    <span className="text-sm font-semibold">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <ForestStoreModal
        open={storeTarget !== null}
        ownerName={
          storeTarget?.type === 'kid'
            ? storeTarget.kid.name
            : storeTarget?.type === 'family'
            ? 'Parents'
            : ''
        }
        ownerType={storeTarget?.type ?? 'kid'}
        items={
          storeTarget?.type === 'kid'
            ? itemsByKid[storeTarget.kid.id] ?? []
            : storeTarget?.type === 'family'
            ? familyItems
            : []
        }
        logs={storeTarget?.type === 'kid' ? logs.filter((log) => log.kidId === storeTarget.kid.id) : []}
        actions={actions}
        meals={meals}
        completions={completions}
        availablePoints={
          storeTarget?.type === 'kid'
            ? Math.max(0, storeTarget.kid.points - (itemsByKid[storeTarget.kid.id] ?? []).reduce((sum, item) => sum + item.cost, 0))
            : Math.max(0, family.totalPoints - familyItems.reduce((sum, item) => sum + item.cost, 0))
        }
        spentPoints={
          storeTarget?.type === 'kid'
            ? (itemsByKid[storeTarget.kid.id] ?? []).reduce((sum, item) => sum + item.cost, 0)
            : familyItems.reduce((sum, item) => sum + item.cost, 0)
        }
        maxSlots={kidSlots.length}
        onClose={() => setStoreTarget(null)}
        onStartPlacement={handleStartPlacement}
        onRemoveItem={handleRemoveItem}
      />
    </div>
  );
};

export default Forest;
