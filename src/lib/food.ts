export type FoodTypeOption = {
  id: string;
  label: string;
  icon: string;
};

export const FOOD_TYPES: FoodTypeOption[] = [
  { id: 'PIZZA', label: 'Pizza', icon: 'Pizza' },
  { id: 'PASTA', label: 'Pasta', icon: 'Soup' },
  { id: 'BURGER', label: 'Burgers', icon: 'Hamburger' },
  { id: 'TACOS', label: 'Tacos', icon: 'Sandwich' },
  { id: 'SUSHI', label: 'Sushi', icon: 'Fish' },
  { id: 'SOUP', label: 'Soup', icon: 'Soup' },
  { id: 'SALAD', label: 'Salad', icon: 'Salad' },
  { id: 'FRUIT', label: 'Fruit', icon: 'Apple' },
  { id: 'VEGGIES', label: 'Veggies', icon: 'Carrot' },
  { id: 'CHICKEN', label: 'Chicken', icon: 'Beef' },
  { id: 'FISH', label: 'Fish', icon: 'Fish' },
  { id: 'RICE', label: 'Rice', icon: 'Egg' },
  { id: 'SANDWICH', label: 'Sandwich', icon: 'Sandwich' },
  { id: 'PANCAKES', label: 'Pancakes', icon: 'CakeSlice' },
  { id: 'CEREAL', label: 'Cereal', icon: 'Milk' },
  { id: 'YOGURT', label: 'Yogurt', icon: 'Milk' },
  { id: 'EGGS', label: 'Eggs', icon: 'Egg' },
  { id: 'NOODLES', label: 'Noodles', icon: 'Soup' },
  { id: 'POTATO', label: 'Potatoes', icon: 'Cookie' },
  { id: 'DESSERT', label: 'Dessert', icon: 'Dessert' },
  { id: 'SNACK', label: 'Snack', icon: 'Cookie' },
  { id: 'SMOOTHIE', label: 'Smoothie', icon: 'Coffee' },
  { id: 'CUSTOM', label: 'Custom', icon: 'Sparkles' }
];

export const getFoodTypeLabel = (id?: string | null, fallback?: string | null) =>
  FOOD_TYPES.find((type) => type.id === id)?.label ?? fallback ?? 'Food';
