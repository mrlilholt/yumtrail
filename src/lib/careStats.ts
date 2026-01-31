import { CareStats } from '../types';

export const DEFAULT_CARE_STATS: CareStats = {
  hunger: 70,
  cleanliness: 70,
  hydration: 70,
  social: 70,
  fun: 70,
  energy: 70,
  curiosity: 70,
  creativity: 70
};

export const clampCareStat = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export const CARE_DECAY_PER_HOUR = 1;

export const getDecayedCareStats = (stats: CareStats, now: Date = new Date()): CareStats => {
  const updatedAt = stats.updatedAt?.toDate?.();
  const lastUpdated = updatedAt ?? now;
  const hoursElapsed = Math.max(0, (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60));
  const decay = hoursElapsed * CARE_DECAY_PER_HOUR;
  if (decay <= 0) return { ...stats };
  return {
    ...stats,
    hunger: clampCareStat(stats.hunger - decay),
    cleanliness: clampCareStat(stats.cleanliness - decay),
    hydration: clampCareStat(stats.hydration - decay),
    social: clampCareStat(stats.social - decay),
    fun: clampCareStat(stats.fun - decay),
    energy: clampCareStat(stats.energy - decay),
    curiosity: clampCareStat(stats.curiosity - decay),
    creativity: clampCareStat(stats.creativity - decay)
  };
};
