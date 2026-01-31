export type ForestSlot = { x: number; y: number };

const buildSlots = (max: number, minSum: number, maxSum: number) => {
  const slots: ForestSlot[] = [];
  for (let x = 0; x <= max; x += 1) {
    for (let y = 0; y <= max; y += 1) {
      const sum = x + y;
      if (sum < minSum || sum > maxSum) continue;
      slots.push({ x, y });
    }
  }
  return slots.sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.x - b.x || a.y - b.y);
};

export const LARGE_SLOTS = buildSlots(5, 2, 8);
export const MINI_SLOTS = buildSlots(3, 1, 5);

export const getSlotsForSize = (size: 'family' | 'kid' | 'mini') => {
  if (size === 'mini') return MINI_SLOTS;
  return LARGE_SLOTS;
};
