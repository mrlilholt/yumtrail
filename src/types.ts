import { Timestamp } from 'firebase/firestore';

export type ActionType = string;
export type MealType = string;
export type MealCompletion = string;

export type ActionDefinition = {
  id: string;
  label: string;
  points: number;
  requiresFood?: boolean;
  requiresCountry?: boolean;
};

export type MealDefinition = {
  id: string;
  label: string;
  points: number;
};

export type CompletionDefinition = {
  id: string;
  label: string;
  multiplier: number;
};

export type PointConfig = {
  actions: ActionDefinition[];
  meals: MealDefinition[];
  completions: CompletionDefinition[];
};

export type Family = {
  id: string;
  ownerUid: string;
  familyName: string;
  totalPoints: number;
  phoneAtTableEnabled: boolean;
  unlockedCountries: string[];
  pointConfig?: PointConfig;
  createdAt?: Timestamp;
};

export type CareStats = {
  hunger: number;
  cleanliness: number;
  hydration: number;
  social: number;
  fun: number;
  energy: number;
  curiosity: number;
  creativity: number;
  updatedAt?: Timestamp;
};

export type Kid = {
  id: string;
  familyId: string;
  name: string;
  avatar:
    | 'character'
    | 'fork'
    | 'spoon'
    | 'knife'
    | 'peanutButterCup'
    | 'sourPatchKid'
    | 'hersheyChocolateBar'
    | 'gummybear';
  points: number;
  cashBalance?: number;
  cashAchievements?: string[];
  careStats?: CareStats;
  createdAt?: Timestamp;
};

export type Log = {
  id: string;
  familyId: string;
  kidId: string;
  actionType: ActionType;
  actionTypes?: ActionType[];
  actionLabel?: string;
  actionLabels?: string[];
  foodType?: string;
  foodTypes?: string[];
  foodLabel?: string;
  foodLabels?: string[];
  foodName?: string;
  countryCode?: string;
  mealType?: MealType;
  mealLabel?: string;
  mealCompletion?: MealCompletion;
  completionLabel?: string;
  restaurantMode?: boolean;
  restaurantMultiplier?: number;
  restaurantBonusBehavior?: boolean;
  restaurantBonusPoliteness?: boolean;
  restaurantBonusOrdering?: boolean;
  restaurantBonusPoints?: number;
  pointsAwarded: number;
  createdAt?: Timestamp;
};

export type RewardItem = {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  cost: number;
  active: boolean;
  createdAt?: Timestamp;
};

export type RewardRequest = {
  id: string;
  familyId: string;
  kidId: string;
  itemId: string;
  itemName: string;
  cost: number;
  shared?: boolean;
  sharedTotal?: number;
  sharedContributions?: { kidId: string; amount: number }[];
  status: 'pending' | 'approved' | 'denied' | 'claimed';
  createdAt?: Timestamp;
  approvedAt?: Timestamp;
  deniedAt?: Timestamp;
  claimedAt?: Timestamp;
};

export type ForestItem = {
  id: string;
  familyId: string;
  itemId: string;
  cost: number;
  slotIndex: number;
  sourceLogId?: string | null;
  createdAt?: Timestamp;
};
