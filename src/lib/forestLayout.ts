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

export const LARGE_SLOTS = buildSlots(6, 0, 12);
export const MINI_SLOTS = buildSlots(3, 0, 6);

export const sizeConfig = {
  family: { width: 760, height: 440, tile: 42, slotStep: 42, depth: 95, centerY: 150, itemScale: 1, gridMax: 6 },
  kid: { width: 640, height: 380, tile: 38, slotStep: 38, depth: 80, centerY: 140, itemScale: 0.9, gridMax: 6 },
  mini: { width: 320, height: 220, tile: 22, slotStep: 30, depth: 48, centerY: 85, itemScale: 0.72, gridMax: 3 }
} as const;

export const getSlotsForSize = (size: 'family' | 'kid' | 'mini') => {
  if (size === 'mini') return MINI_SLOTS;
  return LARGE_SLOTS;
};
