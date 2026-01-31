import { ActionDefinition, CompletionDefinition, MealDefinition, PointConfig } from '../types';

export const DEFAULT_ACTIONS: ActionDefinition[] = [
  { id: 'TRY_NEW', label: 'Try new food', points: 5, requiresFood: true },
  { id: 'NO_COMPLAINT', label: 'No complaint', points: 3 },
  { id: 'HELP_COOK', label: 'Help cook', points: 7 },
  { id: 'FINISH_MEAL', label: 'Finish meal', points: 4 },
  { id: 'INTERNATIONAL', label: 'International bite', points: 10, requiresFood: true, requiresCountry: true }
];

export const DEFAULT_MEALS: MealDefinition[] = [
  { id: 'BREAKFAST', label: 'Breakfast', points: 1 },
  { id: 'LUNCH', label: 'Lunch', points: 2 },
  { id: 'DINNER', label: 'Dinner', points: 3 }
];

export const DEFAULT_COMPLETIONS: CompletionDefinition[] = Array.from({ length: 11 }, (_, index) => {
  const percent = index * 10;
  return {
    id: `P${percent}`,
    label: `${percent}% finished`,
    multiplier: percent / 100
  };
});

const LEGACY_COMPLETION_LABELS: Record<string, string> = {
  FULL: '100% finished',
  HALF: '50% finished',
  NONE: '0% finished',
  SWAP: 'Meal swap'
};

export const DEFAULT_POINT_CONFIG: PointConfig = {
  actions: DEFAULT_ACTIONS,
  meals: DEFAULT_MEALS,
  completions: DEFAULT_COMPLETIONS
};

export const getPointConfig = (config?: Partial<PointConfig> | null): PointConfig => {
  const actions = config?.actions && config.actions.length > 0 ? config.actions : DEFAULT_ACTIONS;
  const meals = config?.meals && config.meals.length > 0 ? config.meals : DEFAULT_MEALS;
  const completions =
    config?.completions && config.completions.length > 0 ? config.completions : DEFAULT_COMPLETIONS;
  return { actions, meals, completions };
};

export const getActionById = (actions: ActionDefinition[], id?: string | null) =>
  actions.find((action) => action.id === id);

export const getMealById = (meals: MealDefinition[], id?: string | null) =>
  meals.find((meal) => meal.id === id);

export const getCompletionById = (completions: CompletionDefinition[], id?: string | null) =>
  completions.find((completion) => completion.id === id);

export const getActionLabel = (
  actions: ActionDefinition[],
  id?: string | null,
  fallback?: string | null
) => getActionById(actions, id)?.label ?? fallback ?? 'Custom action';

export const getActionLabels = (
  actions: ActionDefinition[],
  ids?: string[] | null,
  fallbackLabels?: string[] | null,
  fallbackSingle?: string | null
) => {
  if (ids && ids.length > 0) {
    return ids.map((id) => getActionLabel(actions, id)).join(' + ');
  }
  if (fallbackLabels && fallbackLabels.length > 0) {
    return fallbackLabels.join(' + ');
  }
  if (fallbackSingle) {
    return fallbackSingle;
  }
  return 'Custom action';
};

export const getMealLabel = (meals: MealDefinition[], id?: string | null, fallback?: string | null) =>
  getMealById(meals, id)?.label ?? fallback ?? 'Meal';

export const getCompletionLabel = (
  completions: CompletionDefinition[],
  id?: string | null,
  fallback?: string | null
) =>
  getCompletionById(completions, id)?.label ??
  (id ? LEGACY_COMPLETION_LABELS[id] : null) ??
  fallback ??
  'Completion';
