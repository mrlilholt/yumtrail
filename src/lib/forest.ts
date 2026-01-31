export type Point = {
  x: number;
  y: number;
};

export type DecorType =
  | 'tree'
  | 'mushroom'
  | 'lantern'
  | 'bush'
  | 'pond'
  | 'trailSign'
  | 'wildflower'
  | 'totem';

export type Segment = {
  id: number;
  start: Point;
  end: Point;
  decorType: DecorType;
  decor: Point;
};

const DECOR_TYPES: DecorType[] = ['tree', 'mushroom', 'lantern', 'bush', 'pond'];

export const getSegmentCount = (totalPoints: number) => {
  const safe = Math.max(0, totalPoints || 0);
  return Math.max(1, Math.floor(safe / 20) + 1);
};

export const getKidSproutCount = (kidPoints: number) => {
  const safe = Math.max(0, kidPoints || 0);
  return Math.max(0, Math.floor(safe / 25));
};

export const buildSegments = (segmentCount: number): Segment[] => {
  const count = Math.max(1, segmentCount);
  const spacing = 120;
  const startX = 90;
  const baseY = 170;
  const swing = 14;
  const points: Point[] = Array.from({ length: count + 1 }, (_, index) => {
    const x = startX + index * spacing;
    const y = baseY + (index % 2 === 0 ? -swing : swing);
    return { x, y };
  });

  return Array.from({ length: count }, (_, index) => {
    const start = points[index];
    const end = points[index + 1];
    const decorX = (start.x + end.x) / 2;
    const decorY = Math.min(start.y, end.y) - 24;

    return {
      id: index,
      start,
      end,
      decorType: DECOR_TYPES[index % DECOR_TYPES.length],
      decor: { x: decorX, y: decorY }
    };
  });
};
