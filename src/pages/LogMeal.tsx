import { FormEvent, useEffect, useMemo, useState } from 'react';
import { arrayUnion, collection, doc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { AppOutletContext } from './AppShell';
import { db } from '../lib/firebase';
import { useKids } from '../hooks/useKids';
import { getCompletionById, getMealById, getPointConfig } from '../lib/points';
import { getSegmentCount } from '../lib/forest';
import { useToast } from '../components/ToastProvider';
import { COUNTRIES } from '../lib/countries';
import { calcCashFromPoints } from '../lib/cash';
import AvatarIcon from '../components/AvatarIcon';
import { FOOD_TYPES, getFoodTypeLabel } from '../lib/food';
import {
  Apple,
  BadgePercent,
  Beef,
  CakeSlice,
  Carrot,
  ChefHat,
  ChevronDown,
  Coffee,
  Compass,
  Cookie,
  Dessert,
  Egg,
  Fish,
  Hamburger,
  HandHeart,
  Medal,
  Milk,
  Moon,
  Pizza,
  Salad,
  Sandwich,
  Smile,
  Soup,
  Sparkles,
  Sun,
  Sunrise,
  Users,
  Utensils
} from 'lucide-react';

const ACTION_ICONS: Record<string, typeof Sparkles> = {
  TRY_NEW: Sparkles,
  NO_COMPLAINT: Smile,
  HELP_COOK: ChefHat,
  FINISH_MEAL: Medal,
  INTERNATIONAL: Compass
};

const MEAL_ICONS: Record<string, typeof Sparkles> = {
  BREAKFAST: Sunrise,
  LUNCH: Sun,
  DINNER: Moon
};

const FOOD_ICON_MAP: Record<string, typeof Sparkles> = {
  Pizza,
  Hamburger,
  Salad,
  Soup,
  Apple,
  Carrot,
  Fish,
  Egg,
  Milk,
  Sandwich,
  Coffee,
  Dessert,
  Cookie,
  CakeSlice,
  Beef,
  Sparkles
};

const RESTAURANT_BONUS = {
  doubleMultiplier: 2,
  politeness: 2,
  ordering: 3
};

const LogMeal = () => {
  const { family, familyId } = useOutletContext<AppOutletContext>();
  const { kids } = useKids(familyId);
  const { showToast } = useToast();

  const [kidId, setKidId] = useState('');
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [foodTypes, setFoodTypes] = useState<string[]>([]);
  const [foodName, setFoodName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [mealType, setMealType] = useState('');
  const [mealCompletion, setMealCompletion] = useState('');
  const [completionSlider, setCompletionSlider] = useState(100);
  const [restaurantMode, setRestaurantMode] = useState(false);
  const [bonusBehavior, setBonusBehavior] = useState(false);
  const [bonusPoliteness, setBonusPoliteness] = useState(false);
  const [bonusOrdering, setBonusOrdering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pointConfig = useMemo(() => getPointConfig(family.pointConfig), [family.pointConfig]);
  const { actions, meals, completions } = pointConfig;

  useEffect(() => {
    if (actions.length === 0) {
      if (actionTypes.length > 0) {
        setActionTypes([]);
      }
      return;
    }
    const validSelections = actionTypes.filter((id) => actions.some((action) => action.id === id));
    if (validSelections.length === 0) {
      setActionTypes([actions[0].id]);
    } else if (validSelections.length !== actionTypes.length) {
      setActionTypes(validSelections);
    }
  }, [actions, actionTypes]);

  useEffect(() => {
    if (!meals.find((meal) => meal.id === mealType)) {
      setMealType(meals[0]?.id ?? '');
    }
  }, [meals, mealType]);

  useEffect(() => {
    const defaultCompletion = completions.find((completion) => completion.multiplier === 1) ?? completions[0];
    if (!completions.find((completion) => completion.id === mealCompletion)) {
      setMealCompletion(defaultCompletion?.id ?? '');
    }
  }, [completions, mealCompletion]);

  useEffect(() => {
    if (!restaurantMode) {
      setBonusBehavior(false);
      setBonusPoliteness(false);
      setBonusOrdering(false);
    }
  }, [restaurantMode]);

  const selectedActions = useMemo(
    () => actions.filter((action) => actionTypes.includes(action.id)),
    [actions, actionTypes]
  );
  const selectedMeal = useMemo(() => getMealById(meals, mealType), [meals, mealType]);
  const selectedCompletion = useMemo(
    () => getCompletionById(completions, mealCompletion),
    [completions, mealCompletion]
  );

  const actionPoints = selectedActions.reduce((sum, action) => sum + action.points, 0);
  const basePoints = actionPoints + (selectedMeal?.points ?? 0);
  const multiplier = selectedCompletion?.multiplier ?? 1;
  const restaurantMultiplier = restaurantMode && bonusBehavior ? RESTAURANT_BONUS.doubleMultiplier : 1;
  const bonusPoints = restaurantMode
    ? (bonusPoliteness ? RESTAURANT_BONUS.politeness : 0) + (bonusOrdering ? RESTAURANT_BONUS.ordering : 0)
    : 0;
  const pointsAwarded = Math.round(basePoints * multiplier * restaurantMultiplier + bonusPoints);
  const requiresFood = selectedActions.some((action) => action.requiresFood);
  const requiresCountry = selectedActions.some((action) => action.requiresCountry);
  const completionPercent = Math.min(100, Math.max(0, Math.round(multiplier * 100)));
  const cashEarned = calcCashFromPoints(pointsAwarded);
  const actionLabel =
    selectedActions.length > 0 ? selectedActions.map((action) => action.label).join(' + ') : 'Highlights';
  const selectedHighlightNames = selectedActions.map((action) => action.label);

  useEffect(() => {
    setCompletionSlider(completionPercent);
  }, [completionPercent]);

  const handleCompletionSlider = (value: number) => {
    if (completions.length === 0) return;
    setCompletionSlider(value);
    const target = value / 100;
    const closest = completions.reduce((prev, current) =>
      Math.abs(current.multiplier - target) < Math.abs(prev.multiplier - target) ? current : prev
    );
    setMealCompletion(closest?.id ?? '');
  };

  const handleFoodTypeSelect = (value: string) => {
    setFoodTypes((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((item) => item !== value);
        if (value === 'CUSTOM') {
          setFoodName('');
        }
        return next;
      }
      return [...prev, value];
    });
  };

  const kidOptions = useMemo(() => kids.filter((kid) => kid.id), [kids]);
  const countryOptions = useMemo(
    () => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  useEffect(() => {
    if (!kidId && kids.length > 0) {
      setKidId(kids[0].id);
    }
  }, [kidId, kids]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!familyId) {
      setError('Missing family data.');
      return;
    }

    if (!kidId) {
      setError('Choose a kid to log the meal.');
      return;
    }

    if (actionTypes.length === 0) {
      setError('Choose at least one highlight to log.');
      return;
    }

    if (!mealType) {
      setError('Choose a meal type.');
      return;
    }

    if (!mealCompletion) {
      setError('Choose a completion level.');
      return;
    }

    if (requiresFood && foodTypes.length === 0) {
      setError('Choose at least one food type for this highlight.');
      return;
    }

    if (foodTypes.includes('CUSTOM') && !foodName.trim()) {
      setError('Add a custom food name.');
      return;
    }

    const normalizedCountry = countryCode.trim().toUpperCase();
    if (requiresCountry && !normalizedCountry) {
      setError('Select a country for this international bite.');
      return;
    }

    setLoading(true);

    try {
      const actionLabels = selectedActions.map((action) => action.label);
      const foodLabels = foodTypes
        .map((type) => (type === 'CUSTOM' ? foodName.trim() : getFoodTypeLabel(type)))
        .filter(Boolean);
      const logData: Record<string, unknown> = {
        familyId,
        kidId,
        actionType: actionTypes[0] ?? '',
        actionTypes,
        actionLabel: actionLabels.join(' + '),
        actionLabels,
        mealType,
        mealCompletion,
        pointsAwarded,
        createdAt: serverTimestamp()
      };

      if (restaurantMode) {
        logData.restaurantMode = true;
        logData.restaurantMultiplier = restaurantMultiplier;
        logData.restaurantBonusBehavior = bonusBehavior;
        logData.restaurantBonusPoliteness = bonusPoliteness;
        logData.restaurantBonusOrdering = bonusOrdering;
        logData.restaurantBonusPoints = bonusPoints;
      }

      if (actionLabels.length === 0) {
        logData.actionLabel = 'Highlights';
      }

      if (selectedMeal?.label) {
        logData.mealLabel = selectedMeal.label;
      }

      if (selectedCompletion?.label) {
        logData.completionLabel = selectedCompletion.label;
      }

      if (foodTypes.length > 0) {
        logData.foodTypes = foodTypes;
        logData.foodLabels = foodLabels;
        logData.foodType = foodTypes[0];
        logData.foodLabel = foodLabels.join(' + ');
      }

      if (foodTypes.includes('CUSTOM') && foodName.trim()) {
        logData.foodName = foodName.trim();
      }

      if (requiresCountry) {
        logData.countryCode = normalizedCountry;
      }

      const batch = writeBatch(db);
      const logRef = doc(collection(db, 'logs'));
      batch.set(logRef, logData);
      batch.update(doc(db, 'kids', kidId), {
        points: increment(pointsAwarded),
        cashBalance: increment(cashEarned)
      });

      const familyUpdate: Record<string, unknown> = {
        totalPoints: increment(pointsAwarded)
      };

      const isNewCountry =
        requiresCountry && normalizedCountry && !family.unlockedCountries.includes(normalizedCountry);

      if (isNewCountry) {
        familyUpdate.unlockedCountries = arrayUnion(normalizedCountry);
      }

      batch.update(doc(db, 'families', familyId), familyUpdate);
      await batch.commit();

      const prevSegments = getSegmentCount(family.totalPoints);
      const nextSegments = getSegmentCount(family.totalPoints + pointsAwarded);

      showToast('Meal logged successfully.', 'success');
      if (nextSegments > prevSegments) {
        showToast('New forest milestone unlocked!', 'success');
      }
      if (isNewCountry) {
        showToast('New country discovered!', 'success');
      }

      setKidId('');
      setFoodTypes([]);
      setFoodName('');
      setCountryCode('');
      setMealType(meals[0]?.id ?? '');
      setMealCompletion((completions.find((completion) => completion.multiplier === 1) ?? completions[0])?.id ?? '');
      setActionTypes(actions[0]?.id ? [actions[0].id] : []);
      setRestaurantMode(false);
      setBonusBehavior(false);
      setBonusPoliteness(false);
      setBonusOrdering(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-6">
      {family.phoneAtTableEnabled ? (
        <div className="card border-moss-200 bg-moss-50 px-4 py-3 text-sm text-moss-900">
          Log later, then watch the forest grow after dinner.
        </div>
      ) : null}

      <div className="card p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-moss-100 text-pine-900">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl text-pine-900">Log a meal</h2>
            <p className="mt-2 text-sm text-mist-600">
              Log after dinner. No phones needed at the table.
            </p>
          </div>
        </div>

        {kids.length === 0 ? (
          <p className="mt-4 text-sm text-mist-600">Add a kid first to start logging meals.</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <details className="group rounded-2xl border-2 border-mist-200 bg-white/80 p-4" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-moss-100 text-pine-900">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-pine-900">Explorer</p>
                    <p className="text-xs text-mist-600">Pick who is logging this meal.</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-mist-500 transition group-open:rotate-180" />
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {kidOptions.map((kid) => {
                  const isSelected = kidId === kid.id;
                  return (
                    <button
                      key={kid.id}
                      type="button"
                      onClick={() => setKidId(kid.id)}
                      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-moss-300 bg-moss-100 text-pine-900 shadow-soft'
                          : 'border-mist-200 bg-white/80 text-mist-700 hover:bg-mist-100'
                      }`}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-soft">
                        <AvatarIcon avatar={kid.avatar} size={32} />
                      </span>
                      <span className="text-sm font-semibold">{kid.name}</span>
                    </button>
                  );
                })}
              </div>
            </details>

            <details className="group rounded-2xl border-2 border-mist-200 bg-white/80 p-4" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-moss-100 text-pine-900">
                    <Utensils className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-pine-900">Meal + completion</p>
                    <p className="text-xs text-mist-600">Choose the meal and how much was finished.</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-mist-500 transition group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-6">
                <div>
                  <p className="text-xs font-semibold text-mist-700">Meal</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    {meals.map((meal) => {
                      const isSelected = mealType === meal.id;
                      const Icon = MEAL_ICONS[meal.id] ?? Sparkles;
                      return (
                        <button
                          key={meal.id}
                          type="button"
                          onClick={() => setMealType(meal.id)}
                          className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-4 text-center text-sm font-semibold transition ${
                            isSelected
                              ? 'border-moss-300 bg-moss-100 text-pine-900 shadow-soft'
                              : 'border-mist-200 bg-white/80 text-mist-700 hover:bg-mist-100'
                          }`}
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-moss-700 shadow-soft">
                            <Icon className="h-6 w-6" />
                          </span>
                          <span>{meal.label}</span>
                          <span className="text-[11px] text-mist-500">+{meal.points} pts</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-mist-700">Completion</p>
                    <span className="rounded-full bg-moss-100 px-2 py-1 text-xs font-semibold text-pine-900">
                      {completionPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={completionSlider}
                    onChange={(event) => handleCompletionSlider(Number(event.target.value))}
                    className="slider-kid mt-3"
                  />
                  <div className="mt-2 flex justify-between text-[11px] text-mist-600">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                  <p className="mt-2 text-xs text-mist-600">
                    {selectedCompletion?.label ?? 'Pick how much was finished.'}
                  </p>
                </div>
              </div>
            </details>

            <details className="group rounded-2xl border-2 border-mist-200 bg-white/80 p-4" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-moss-100 text-pine-900">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-pine-900">Highlights</p>
                    <p className="text-xs text-mist-600">Choose the highlight that matches this meal.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-moss-100 px-2 py-1 text-[11px] font-semibold text-pine-900">
                    {actionTypes.length} selected
                  </span>
                  <ChevronDown className="h-4 w-4 text-mist-500 transition group-open:rotate-180" />
                </div>
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {actions.map((action) => {
                  const isSelected = actionTypes.includes(action.id);
                  const Icon = ACTION_ICONS[action.id] ?? Sparkles;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() =>
                        setActionTypes((prev) =>
                          prev.includes(action.id) ? prev.filter((id) => id !== action.id) : [...prev, action.id]
                        )
                      }
                      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-moss-300 bg-moss-100 text-pine-900 shadow-soft'
                          : 'border-mist-200 bg-white/80 text-mist-700 hover:bg-mist-100'
                      }`}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-moss-700 shadow-soft">
                        <Icon className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{action.label}</p>
                        <p className="text-[11px] text-mist-500">+{action.points} pts</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-mist-600">
                {selectedHighlightNames.length > 0
                  ? `Selected: ${selectedHighlightNames.join(' + ')}`
                  : 'Selected: none yet.'}
              </p>
            </details>

            <details className="group rounded-2xl border-2 border-mist-200 bg-white/80 p-4" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-moss-100 text-pine-900">
                    <Apple className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-pine-900">Food details</p>
                    <p className="text-xs text-mist-600">
                      {requiresFood ? 'Food type required for this highlight.' : 'Optional details for extra context.'}
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-mist-500 transition group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-mist-700">
                    Food type {requiresFood ? '(required)' : '(optional)'}
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {FOOD_TYPES.map((type) => {
                  const isSelected = foodTypes.includes(type.id);
                  const Icon = FOOD_ICON_MAP[type.icon] ?? Sparkles;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleFoodTypeSelect(type.id)}
                          className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-4 text-center text-sm font-semibold transition ${
                            isSelected
                              ? 'border-moss-300 bg-moss-100 text-pine-900 shadow-soft'
                              : 'border-mist-200 bg-white/80 text-mist-700 hover:bg-mist-100'
                          }`}
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-moss-700 shadow-soft">
                            <Icon className="h-6 w-6" />
                          </span>
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
              {foodTypes.includes('CUSTOM') ? (
                <div className="mt-3">
                      <label htmlFor="foodName" className="text-xs font-semibold text-mist-700">
                        Write in the food
                      </label>
                      <input
                        id="foodName"
                        className="input mt-1"
                        value={foodName}
                        onChange={(event) => setFoodName(event.target.value)}
                        placeholder="Mac and cheese"
                      />
                    </div>
                  ) : null}
                </div>

                {requiresCountry ? (
                  <div>
                    <label htmlFor="countryCode" className="text-xs font-semibold text-mist-700">
                      Country
                    </label>
                    <select
                      id="countryCode"
                      className="select mt-1"
                      value={countryCode}
                      onChange={(event) => setCountryCode(event.target.value)}
                      required
                    >
                      <option value="">Select a country</option>
                      {countryOptions.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </details>

            <details className="group rounded-2xl border-2 border-mist-200 bg-white/80 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-moss-100 text-pine-900">
                    <BadgePercent className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-pine-900">Restaurant bonus</p>
                    <p className="text-xs text-mist-600">Add bonus points for dining out.</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-mist-500 transition group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-mist-700">Restaurant bonus round</p>
                    <p className="text-xs text-mist-600">
                      Toggle when dining out to unlock bonus points.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-semibold transition ${
                      restaurantMode
                        ? 'border-moss-300 bg-moss-200 text-pine-900 shadow-soft'
                        : 'border-mist-200 bg-white text-mist-600 hover:bg-mist-100'
                    }`}
                    onClick={() => setRestaurantMode((prev) => !prev)}
                  >
                    <BadgePercent className="h-4 w-4" />
                    {restaurantMode ? 'Bonus round on' : 'Turn on bonus round'}
                  </button>
                </div>

                {restaurantMode ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border-2 border-moss-200 bg-moss-100 px-4 py-3 text-xs font-semibold text-pine-900">
                      🎉 Bonus round activated! {bonusBehavior ? 'Great behavior doubles all points.' : 'Tap great behavior to double points.'}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setBonusBehavior((prev) => !prev)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-3 text-xs font-semibold transition ${
                          bonusBehavior
                            ? 'border-moss-300 bg-moss-100 text-pine-900 shadow-soft'
                            : 'border-mist-200 bg-white/80 text-mist-600 hover:bg-mist-100'
                        }`}
                      >
                        <Smile className="h-6 w-6 text-moss-700" />
                        Great behavior (×{RESTAURANT_BONUS.doubleMultiplier})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBonusPoliteness((prev) => !prev)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-3 text-xs font-semibold transition ${
                          bonusPoliteness
                            ? 'border-moss-300 bg-moss-100 text-pine-900 shadow-soft'
                            : 'border-mist-200 bg-white/80 text-mist-600 hover:bg-mist-100'
                        }`}
                      >
                        <HandHeart className="h-6 w-6 text-moss-700" />
                        Politeness (+{RESTAURANT_BONUS.politeness})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBonusOrdering((prev) => !prev)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-3 text-xs font-semibold transition ${
                          bonusOrdering
                            ? 'border-moss-300 bg-moss-100 text-pine-900 shadow-soft'
                            : 'border-mist-200 bg-white/80 text-mist-600 hover:bg-mist-100'
                        }`}
                      >
                        <Utensils className="h-6 w-6 text-moss-700" />
                        Ordered my own food (+{RESTAURANT_BONUS.ordering})
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </details>

            <div className="rounded-2xl border-2 border-mist-200 bg-white/80 px-4 py-3 text-sm text-mist-700">
              <div className="flex items-center justify-between">
                <span>Points preview</span>
                <span className="text-lg font-semibold text-pine-900">+{pointsAwarded}</span>
              </div>
              <span className="mt-1 block text-xs text-mist-500">
                {actionLabel} ({actionPoints}) + {selectedMeal?.label ?? 'meal'} ({selectedMeal?.points ?? 0}){' '}
                {multiplier === 1 ? '' : `× ${multiplier}`}
                {restaurantMode && bonusBehavior ? ` × ${restaurantMultiplier}` : ''}{bonusPoints ? ` + ${bonusPoints} bonus` : ''}
              </span>
            </div>

            {error ? <p className="text-sm text-sun-700">{error}</p> : null}

            <button className="btn-primary w-full text-base" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Log meal'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LogMeal;
