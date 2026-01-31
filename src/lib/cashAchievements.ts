export type CashAchievement = {
  id: string;
  label: string;
  itemId: string;
  requiredCount: number;
  cashReward: number;
};

export const CASH_ACHIEVEMENTS: CashAchievement[] = [
  { id: 'round-tree-3', label: 'Round Tree Trio', itemId: 'roundTree', requiredCount: 3, cashReward: 1 },
  { id: 'pine-tree-3', label: 'Pine Tree Trio', itemId: 'pineTree', requiredCount: 3, cashReward: 1 },
  { id: 'bloom-tree-2', label: 'Bloom Buddies', itemId: 'bloomTree', requiredCount: 2, cashReward: 1 },
  { id: 'sunflower-2', label: 'Sunny Patch', itemId: 'sunflowerPatch', requiredCount: 2, cashReward: 1 },
  { id: 'mushroom-2', label: 'Mushroom Mix', itemId: 'mushroomPatch', requiredCount: 2, cashReward: 1 },
  { id: 'campfire-1', label: 'Campfire Story', itemId: 'campfire', requiredCount: 1, cashReward: 1 },
  { id: 'pond-1', label: 'Tiny Pond', itemId: 'tinyPond', requiredCount: 1, cashReward: 1 },
  { id: 'windmill-1', label: 'Windmill Wonder', itemId: 'windmill', requiredCount: 1, cashReward: 2 }
];
