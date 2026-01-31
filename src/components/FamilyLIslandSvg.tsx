import { useId, useMemo } from 'react';
import { getSlotsForSize } from '../lib/forestLayout';
import { ForestItemId } from '../lib/forestCatalog';
import ForestItemSvg from './ForestItemSvg';
import { ForestIslandItem } from './ForestIslandSvg';
import cloudPng from '../../assets/cloud.png';
import cloudTwoPng from '../../assets/cloud2.png';
import cloudThreePng from '../../assets/cloud3.png';
import cloudFourPng from '../../assets/cloud4.png';
import characterUpLeftPng from '../../assets/characterUpLeft.png';
import characterUpRightPng from '../../assets/characterUpRight.png';
import characterDownLeftPng from '../../assets/characterDownLeft.png';
import characterDownRightPng from '../../assets/characterDownRight.png';

export type FamilyLIslandTile = {
  id: string;
  label: string;
  items: ForestIslandItem[];
};

type FamilyLIslandSvgProps = {
  tiles: FamilyLIslandTile[];
  className?: string;
};

const tilePositions = [
  { id: 'tile-a', gridX: 0, gridY: 0 },
  { id: 'tile-b', gridX: 1, gridY: 0 },
  { id: 'tile-c', gridX: 0, gridY: 1 }
];

const FamilyLIslandSvg = ({ tiles, className }: FamilyLIslandSvgProps) => {
  const uid = useId().replace(/:/g, '');
  const width = 720;
  const height = 420;
  const tileWidth = 220;
  const tileHeight = 110;
  const depth = 80;
  const centerX = width / 2;
  const centerY = 140;
  const slotTile = tileWidth / 10;
  const slots = getSlotsForSize('kid');
  const itemScale = 0.6;

  const clouds = useMemo(() => {
    const seed = uid.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + tiles.length * 17;
    const random = (() => {
      let value = seed + 0x6d2b79f5;
      return () => {
        value += 0x6d2b79f5;
        let t = Math.imul(value ^ (value >>> 15), 1 | value);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    const count = 3;
    const sizeMin = 50;
    const sizeMax = 90;
    const yMin = height * 0.2;
    const yMax = height * 0.5;
    const driftX = width * 0.6;
    const driftY = height * 0.1;
    const durationMin = 24;
    const durationMax = 38;
    const opacityMin = 0.35;
    const opacityMax = 0.6;

    const variants = [cloudPng, cloudTwoPng, cloudThreePng, cloudFourPng];
    return Array.from({ length: count }).map((_, index) => {
      const sizeValue = sizeMin + (sizeMax - sizeMin) * random();
      const startX = -sizeValue - random() * (width * 0.25);
      const startY = yMin + random() * (yMax - yMin);
      const duration = durationMin + (durationMax - durationMin) * random();
      const delay = -duration * random();
      const opacity = opacityMin + (opacityMax - opacityMin) * random();
      const variantIndex = Math.floor(random() * variants.length);
      const driftMultiplier = 0.6 + random() * 0.4;
      const endX = width + sizeValue + random() * (width * 0.25);
      const endY = Math.min(startY + driftY * driftMultiplier, height * 0.5);
      return {
        id: `cloud-${index}`,
        image: variants[variantIndex],
        size: sizeValue,
        startX,
        startY,
        endX,
        endY,
        duration,
        delay,
        opacity
      };
    });
  }, [uid, width, height, tiles.length]);

  const tileCenters = tilePositions.map((tile) => {
    const x = centerX + (tile.gridX - tile.gridY) * (tileWidth / 2);
    const y = centerY + (tile.gridX + tile.gridY) * (tileHeight / 2);
    return { ...tile, x, y };
  });

  const neighborLookup = new Set(tilePositions.map((tile) => `${tile.gridX}-${tile.gridY}`));

  const getDiamond = (cx: number, cy: number) => ({
    top: { x: cx, y: cy - tileHeight / 2 },
    right: { x: cx + tileWidth / 2, y: cy },
    bottom: { x: cx, y: cy + tileHeight / 2 },
    left: { x: cx - tileWidth / 2, y: cy }
  });

  const isoPoint = (tileCenterX: number, tileCenterY: number, gridX: number, gridY: number) => {
    const topY = tileCenterY - tileHeight / 2;
    const baseX = tileCenterX + (gridX - gridY) * slotTile;
    const baseY = topY + (gridX + gridY) * slotTile * 0.5;
    return { x: baseX, y: baseY };
  };

  const tileItems = tileCenters.map((tile, index) => {
    const items = tiles[index]?.items ?? [];
    const usedSlots = new Set<number>();
    return items
      .map((item) => {
        if (slots.length === 0) return null;
        let slotIndex = ((item.slotIndex ?? 0) % slots.length + slots.length) % slots.length;
        if (usedSlots.has(slotIndex)) {
          const nextSlot = slots.findIndex((_, slotIdx) => !usedSlots.has(slotIdx));
          if (nextSlot === -1) return null;
          slotIndex = nextSlot;
        }
        usedSlots.add(slotIndex);
        const slot = slots[slotIndex];
        const point = isoPoint(tile.x, tile.y, slot.x, slot.y);
        return {
          item,
          point,
          depth: slot.x + slot.y + tile.gridX * 4 + tile.gridY * 4
        };
      })
      .filter(
        (placement): placement is { item: ForestIslandItem; point: { x: number; y: number }; depth: number } =>
          Boolean(placement)
      );
  });

  const flattenedItems = tileItems.flat().sort((a, b) => a.depth - b.depth);

  const character = useMemo(() => {
    if (slots.length < 3) return null;
    const sums = slots.map((slot) => slot.x + slot.y);
    const minSum = Math.min(...sums);
    const maxSum = Math.max(...sums);
    const xs = slots.map((slot) => slot.x);
    const ys = slots.map((slot) => slot.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const safeSlots = slots.filter(
      (slot) =>
        slot.x > minX &&
        slot.x < maxX &&
        slot.y > minY &&
        slot.y < maxY &&
        slot.x + slot.y > minSum &&
        slot.x + slot.y < maxSum
    );
    const availableSlots = safeSlots.length >= 4 ? safeSlots : slots;
    const seed = uid.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + 97;
    let value = seed + 0x9e3779b9;
    const random = () => {
      value += 0x9e3779b9;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const slotSet = new Set(availableSlots.map((slot) => `${slot.x},${slot.y}`));
    const maxAttempts = 40;
    let gridPoints: { x: number; y: number }[] | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const start = availableSlots[Math.floor(random() * availableSlots.length)];
      const opposite = availableSlots[Math.floor(random() * availableSlots.length)];
      if (start.x === opposite.x || start.y === opposite.y) continue;
      const cornerOne = { x: opposite.x, y: start.y };
      const cornerTwo = { x: start.x, y: opposite.y };
      if (
        slotSet.has(`${cornerOne.x},${cornerOne.y}`) &&
        slotSet.has(`${cornerTwo.x},${cornerTwo.y}`)
      ) {
        gridPoints = [start, cornerOne, opposite, cornerTwo];
        break;
      }
    }

    if (!gridPoints) {
      gridPoints = availableSlots.slice(0, Math.min(4, availableSlots.length));
    }

    const chosenTile = tileCenters[Math.floor(random() * tileCenters.length)];
    const points = gridPoints.map((grid) => isoPoint(chosenTile.x, chosenTile.y, grid.x, grid.y));
    const directions = points.map((point, index) => {
      const next = points[(index + 1) % points.length];
      const dx = next.x - point.x;
      const dy = next.y - point.y;
      if (dx >= 0 && dy >= 0) return 'Right-Down';
      if (dx >= 0 && dy < 0) return 'Right-Up';
      if (dx < 0 && dy >= 0) return 'Left-Down';
      return 'Left-Up';
    });

    const frames = [...points, points[0]];
    const directionFrames = [...directions, directions[0]];
    const valuesX = frames.map((point) => point.x).join(';');
    const valuesY = frames.map((point) => point.y).join(';');
    const keyTimes = frames.map((_, index) => index / (frames.length - 1)).join(';');
    const duration = 20 + random() * 10;
    const delay = -duration * random();
    const sizeValue = 20 + random() * 6;
    return {
      duration,
      delay,
      size: sizeValue,
      valuesX,
      valuesY,
      keyTimes,
      directionFrames
    };
  }, [uid, slots, tileCenters, slotTile]);

  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Family island">
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6d8cf2" />
          <stop offset="55%" stopColor="#6484e7" />
          <stop offset="100%" stopColor="#5b73db" />
        </linearGradient>
        <linearGradient id={`grass-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d1f6a3" />
          <stop offset="45%" stopColor="#aee77a" />
          <stop offset="100%" stopColor="#7fc854" />
        </linearGradient>
        <linearGradient id={`soil-left-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8f582d" />
          <stop offset="100%" stopColor="#6f3f1f" />
        </linearGradient>
        <linearGradient id={`soil-right-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4a26" />
          <stop offset="100%" stopColor="#5d341a" />
        </linearGradient>
        <filter id={`soft-shadow-${uid}`} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#2a3b73" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect width={width} height={height} fill={`url(#sky-${uid})`} rx={28} />

      <ellipse
        cx={centerX}
        cy={centerY + tileHeight / 2 + depth + 18}
        rx={tileWidth * 0.75}
        ry={26}
        fill="#2c3a73"
        opacity={0.35}
      />

      <g filter={`url(#soft-shadow-${uid})`}>
        {tileCenters.map((tile) => {
          const diamond = getDiamond(tile.x, tile.y);
          const hasSouthNeighbor = neighborLookup.has(`${tile.gridX}-${tile.gridY + 1}`);
          const hasEastNeighbor = neighborLookup.has(`${tile.gridX + 1}-${tile.gridY}`);

          return (
            <g key={tile.id}>
              {!hasSouthNeighbor ? (
                <polygon
                  points={
                    `${diamond.left.x},${diamond.left.y} ` +
                    `${diamond.bottom.x},${diamond.bottom.y} ` +
                    `${diamond.bottom.x},${diamond.bottom.y + depth} ` +
                    `${diamond.left.x},${diamond.left.y + depth}`
                  }
                  fill={`url(#soil-left-${uid})`}
                />
              ) : null}
              {!hasEastNeighbor ? (
                <polygon
                  points={
                    `${diamond.bottom.x},${diamond.bottom.y} ` +
                    `${diamond.right.x},${diamond.right.y} ` +
                    `${diamond.right.x},${diamond.right.y + depth} ` +
                    `${diamond.bottom.x},${diamond.bottom.y + depth}`
                  }
                  fill={`url(#soil-right-${uid})`}
                />
              ) : null}
              <polygon
                points={
                  `${diamond.top.x},${diamond.top.y} ` +
                  `${diamond.right.x},${diamond.right.y} ` +
                  `${diamond.bottom.x},${diamond.bottom.y} ` +
                  `${diamond.left.x},${diamond.left.y}`
                }
                fill={`url(#grass-${uid})`}
              />
            </g>
          );
        })}
      </g>

      {flattenedItems.map(({ item, point }) => (
        <ForestItemSvg
          key={item.id}
          itemId={item.itemId as ForestItemId}
          x={point.x}
          y={point.y}
          scale={itemScale}
          title={item.tooltip}
        />
      ))}

      {character ? (
        <g>
          {([
            { key: 'Left-Up', img: characterUpLeftPng },
            { key: 'Right-Up', img: characterUpRightPng },
            { key: 'Left-Down', img: characterDownLeftPng },
            { key: 'Right-Down', img: characterDownRightPng }
          ] as const).map((sprite) => (
            <image
              key={sprite.key}
              href={sprite.img}
              width={character.size}
              height={character.size}
              x={-character.size / 2}
              y={-character.size}
              opacity={0.95}
            >
              <animate
                attributeName="x"
                values={character.valuesX}
                keyTimes={character.keyTimes}
                dur={`${character.duration}s`}
                repeatCount="indefinite"
                begin={`${character.delay}s`}
              />
              <animate
                attributeName="y"
                values={character.valuesY}
                keyTimes={character.keyTimes}
                dur={`${character.duration}s`}
                repeatCount="indefinite"
                begin={`${character.delay}s`}
              />
              <animate
                attributeName="visibility"
                values={character.directionFrames
                  .map((direction) => (direction === sprite.key ? 'visible' : 'hidden'))
                  .join(';')}
                keyTimes={character.keyTimes}
                dur={`${character.duration}s`}
                repeatCount="indefinite"
                begin={`${character.delay}s`}
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 -2; 0 0"
                dur="3.6s"
                repeatCount="indefinite"
                additive="sum"
              />
            </image>
          ))}
        </g>
      ) : null}

      {clouds.map((cloud) => (
        <image
          key={cloud.id}
          href={cloud.image}
          x={0}
          y={0}
          width={cloud.size}
          height={cloud.size}
          opacity={cloud.opacity}
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`${cloud.startX} ${cloud.startY}; ${cloud.endX} ${cloud.endY}`}
            dur={`${cloud.duration}s`}
            repeatCount="indefinite"
            begin={`${cloud.delay}s`}
          />
        </image>
      ))}
    </svg>
  );
};

export default FamilyLIslandSvg;
