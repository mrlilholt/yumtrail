export const CASH_PER_POINT = 0.5;

export const calcCashFromPoints = (points: number) =>
  Math.round(points * CASH_PER_POINT * 100) / 100;

export const formatCash = (value: number) => value.toFixed(2);
