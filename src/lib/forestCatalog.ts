import pineTreePng from '../../assets/pineTree.png';
import roundedTreePng from '../../assets/roundedTree.png';
import bloomingTreePng from '../../assets/bloomingTree.png';
import berryBushPng from '../../assets/berryBush.png';
import mushroomPatchPng from '../../assets/mushroomPatch.png';
import sunflowerPatchPng from '../../assets/sunflowerPatch.png';
import flowerRingPng from '../../assets/flowerRing.png';
import rockGardenPng from '../../assets/rockGarden.png';
import tinyPondPng from '../../assets/tinyPond.png';
import campfirePng from '../../assets/campfire.png';
import gardenBenchPng from '../../assets/gardenBench.png';
import trailPostPng from '../../assets/trailPost.png';
import tinyCabinPng from '../../assets/tinyCabin.png';
import lanternPostPng from '../../assets/lanternPost.png';
import marketStallPng from '../../assets/marketStall.png';
import windmillPng from '../../assets/windmill.png';
import forestStatuePng from '../../assets/forestStatue.png';

export const FOREST_CATEGORIES = ['trees', 'plants', 'decor', 'trail', 'water', 'structures'] as const;
export type ForestItemCategory = (typeof FOREST_CATEGORIES)[number];

export const FOREST_CATALOG = [
  {
    id: 'roundTree',
    name: 'Round Tree',
    cost: 6,
    category: 'trees',
    description: 'A cheerful canopy tree that fills out the island.',
    image: roundedTreePng
  },
  {
    id: 'pineTree',
    name: 'Pine Tree',
    cost: 8,
    category: 'trees',
    description: 'A tall evergreen to anchor the skyline.',
    image: pineTreePng
  },
  {
    id: 'bloomTree',
    name: 'Bloom Tree',
    cost: 12,
    category: 'trees',
    description: 'A flowering tree with a burst of color.',
    image: bloomingTreePng
  },
  {
    id: 'berryBush',
    name: 'Berry Bush',
    cost: 5,
    category: 'plants',
    description: 'Low shrubs with bright berry pops.',
    image: berryBushPng
  },
  {
    id: 'mushroomPatch',
    name: 'Mushroom Patch',
    cost: 7,
    category: 'plants',
    description: 'Tiny mushrooms hiding under the canopy.',
    image: mushroomPatchPng
  },
  {
    id: 'sunflowerPatch',
    name: 'Sunflower Patch',
    cost: 9,
    category: 'plants',
    description: 'Sunny blooms that follow the light.',
    image: sunflowerPatchPng
  },
  {
    id: 'flowerRing',
    name: 'Flower Ring',
    cost: 9,
    category: 'decor',
    description: 'A circular bed of wildflowers.',
    image: flowerRingPng
  },
  {
    id: 'rockGarden',
    name: 'Rock Garden',
    cost: 10,
    category: 'decor',
    description: 'Stacked stones for a peaceful corner.',
    image: rockGardenPng
  },
  {
    id: 'tinyPond',
    name: 'Tiny Pond',
    cost: 12,
    category: 'water',
    description: 'A shimmering pond with lily ripples.',
    image: tinyPondPng
  },
  {
    id: 'campfire',
    name: 'Campfire',
    cost: 14,
    category: 'trail',
    description: 'A cozy campfire for story time.',
    image: campfirePng
  },
  {
    id: 'bench',
    name: 'Garden Bench',
    cost: 11,
    category: 'trail',
    description: 'A quiet seat to watch the forest grow.',
    image: gardenBenchPng
  },
  {
    id: 'trailSign',
    name: 'Trail Sign',
    cost: 11,
    category: 'trail',
    description: 'A signpost marking adventures.',
    image: trailPostPng
  },
  {
    id: 'lanternPost',
    name: 'Lantern Post',
    cost: 13,
    category: 'trail',
    description: 'A glowing lantern that lights the path.',
    image: lanternPostPng
  },
  {
    id: 'cabin',
    name: 'Tiny Cabin',
    cost: 18,
    category: 'structures',
    description: 'A snug cabin tucked into the trees.',
    image: tinyCabinPng
  },
  {
    id: 'marketStall',
    name: 'Market Stall',
    cost: 16,
    category: 'structures',
    description: 'A lively stall for forest goods.',
    image: marketStallPng
  },
  {
    id: 'windmill',
    name: 'Windmill',
    cost: 24,
    category: 'structures',
    description: 'A playful windmill that catches the breeze.',
    image: windmillPng
  },
  {
    id: 'statue',
    name: 'Forest Statue',
    cost: 22,
    category: 'decor',
    description: 'A carved statue to celebrate milestones.',
    image: forestStatuePng
  }
] as const;

export type ForestCatalogItem = (typeof FOREST_CATALOG)[number] & {
  image?: string;
  imageScale?: number;
  imageOffset?: { x: number; y: number };
};
export type ForestItemId = ForestCatalogItem['id'];

export const getForestItemById = (id: string): ForestCatalogItem | undefined =>
  FOREST_CATALOG.find((item) => item.id === id);
