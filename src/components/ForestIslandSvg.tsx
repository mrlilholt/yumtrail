import { useId, useMemo, useRef, useState } from 'react';
import { ForestItem, Kid } from '../types';
import { getSlotsForSize } from '../lib/forestLayout';
import ForestItemSvg from './ForestItemSvg';
import { ForestItemId } from '../lib/forestCatalog';
import cloudPng from '../../assets/cloud.png';
import cloudTwoPng from '../../assets/cloud2.png';
import cloudThreePng from '../../assets/cloud3.png';
import cloudFourPng from '../../assets/cloud4.png';
import characterUpLeftPng from '../../assets/characterUpLeft.png';
import characterUpRightPng from '../../assets/characterUpRight.png';
import characterDownLeftPng from '../../assets/characterDownLeft.png';
import characterDownRightPng from '../../assets/characterDownRight.png';
import forkPng from '../../assets/fork.png';
import knifePng from '../../assets/knife.png';
import spoonPng from '../../assets/spoon.png';
import peanutButterCupPng from '../../assets/peanutButterCup.png';
import sourPatchKidPng from '../../assets/sourPatchKid.png';
import hersheyChocolateBarPng from '../../assets/hersheyChocolateBar.png';
import gummybearPng from '../../assets/gummybear.png';

export type ForestIslandItem = ForestItem & { tooltip?: string };

const ITEM_REACTIONS: Partial<Record<ForestItemId, string>> = {
  roundTree: '🌳',
  pineTree: '🌲',
  bloomTree: '🌸',
  berryBush: '🫐',
  mushroomPatch: '🍄',
  sunflowerPatch: '🌻',
  flowerRing: '💐',
  rockGarden: '🪨',
  tinyPond: '🐟',
  campfire: '🔥',
  bench: '🪑',
  trailSign: '🪧',
  lanternPost: '🏮',
  cabin: '🏡',
  marketStall: '🧺',
  windmill: '🌬️',
  statue: '🗿'
};

type ForestIslandSvgProps = {
  items: ForestIslandItem[];
  size?: 'family' | 'kid' | 'mini';
  compact?: boolean;
  className?: string;
  characterAvatar?: Kid['avatar'];
  bubbleMessage?: string;
  bubbleKey?: string;
  bubbleScale?: number;
  manualAvatar?: {
    enabled: boolean;
    position?: { x: number; y: number };
    onChange?: (position: { x: number; y: number }) => void;
  };
  onItemSelect?: (item: ForestIslandItem) => void;
  selectedItemId?: string;
  placement?: {
    active: boolean;
    filledSlots: number[];
    onSelect: (slotIndex: number) => void;
  };
};

const sizeConfig = {
  family: { width: 760, height: 440, tile: 42, slotStep: 42, depth: 95, centerY: 150, itemScale: 1 },
  kid: { width: 640, height: 380, tile: 38, slotStep: 38, depth: 80, centerY: 140, itemScale: 0.9 },
  mini: { width: 320, height: 220, tile: 22, slotStep: 30, depth: 48, centerY: 85, itemScale: 0.72 }
} as const;

const ForestIslandSvg = ({
  items,
  size = 'family',
  compact = false,
  className,
  characterAvatar = 'character',
  bubbleMessage,
  bubbleKey,
  bubbleScale,
  manualAvatar,
  onItemSelect,
  selectedItemId,
  placement
}: ForestIslandSvgProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ pointerId: number } | null>(null);
  const uid = useId().replace(/:/g, '');
  const { width, height, tile, slotStep, depth, centerY, itemScale } = sizeConfig[size];
  const topWidth = tile * 10;
  const topHeight = tile * 5;
  const centerX = width / 2;
  const topY = centerY - topHeight / 2;
  const manualActive = manualAvatar?.enabled ?? false;

  const slots = getSlotsForSize(size);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  const isoPoint = (gridX: number, gridY: number) => {
    const baseX = centerX + (gridX - gridY) * slotStep;
    const baseY = topY + (gridX + gridY) * slotStep * 0.5;
    return { x: baseX, y: baseY };
  };

  const topPoints = [
    `${centerX},${centerY - topHeight / 2}`,
    `${centerX + topWidth / 2},${centerY}`,
    `${centerX},${centerY + topHeight / 2}`,
    `${centerX - topWidth / 2},${centerY}`
  ].join(' ');

  const leftSidePoints = [
    `${centerX - topWidth / 2},${centerY}`,
    `${centerX},${centerY + topHeight / 2}`,
    `${centerX},${centerY + topHeight / 2 + depth}`,
    `${centerX - topWidth / 2},${centerY + depth}`
  ].join(' ');

  const rightSidePoints = [
    `${centerX + topWidth / 2},${centerY}`,
    `${centerX},${centerY + topHeight / 2}`,
    `${centerX},${centerY + topHeight / 2 + depth}`,
    `${centerX + topWidth / 2},${centerY + depth}`
  ].join(' ');

  const usedSlots = new Set<number>();
  const itemPlacements = items
    .map((item) => {
      if (slots.length === 0) return null;
      let slotIndex = ((item.slotIndex ?? 0) % slots.length + slots.length) % slots.length;
      if (usedSlots.has(slotIndex)) {
        const nextSlot = slots.findIndex((_, index) => !usedSlots.has(index));
        if (nextSlot === -1) return null;
        slotIndex = nextSlot;
      }
      usedSlots.add(slotIndex);
      const slot = slots[slotIndex];
      const point = isoPoint(slot.x, slot.y);
      return {
        item,
        slot,
        depth: slot.x + slot.y,
        point
      };
    })
    .filter(
      (placement): placement is {
        item: ForestIslandItem;
        slot: { x: number; y: number };
        depth: number;
        point: { x: number; y: number };
      } =>
        Boolean(placement)
    )
    .sort((a, b) => a.depth - b.depth || a.slot.x - b.slot.x);

  const grassSprigs = size === 'mini'
    ? compact
      ? [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 2, y: 2 }
        ]
      : [
          { x: 0, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 0 },
          { x: 2, y: 2 }
        ]
    : compact
    ? [
        { x: 1, y: 2 },
        { x: 3, y: 1 },
        { x: 4, y: 3 },
        { x: 2, y: 4 }
      ]
    : [
        { x: 0, y: 2 },
        { x: 1, y: 4 },
        { x: 2, y: 0 },
        { x: 3, y: 2 },
        { x: 4, y: 1 },
        { x: 4, y: 4 },
        { x: 2, y: 3 },
        { x: 5, y: 2 }
      ];

  const clouds = useMemo(() => {
    const seed = uid.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + width;
    const random = (() => {
      let value = seed + 0x6d2b79f5;
      return () => {
        value += 0x6d2b79f5;
        let t = Math.imul(value ^ (value >>> 15), 1 | value);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    const config = size === 'mini'
      ? {
          count: compact ? 2 : 3,
          sizeMin: 28,
          sizeMax: 48,
          yMin: height * 0.2,
          yMax: height * 0.5,
          driftX: width * 0.6,
          driftY: height * 0.08,
          durationMin: 18,
          durationMax: 28,
          opacityMin: 0.35,
          opacityMax: 0.55
        }
      : {
          count: compact ? 3 : 4,
          sizeMin: 48,
          sizeMax: 82,
          yMin: height * 0.2,
          yMax: height * 0.5,
          driftX: width * 0.6,
          driftY: height * 0.1,
          durationMin: 22,
          durationMax: 36,
          opacityMin: 0.35,
          opacityMax: 0.6
        };

    const variants = [cloudPng, cloudTwoPng, cloudThreePng, cloudFourPng];
    return Array.from({ length: config.count }).map((_, index) => {
      const sizeValue = config.sizeMin + (config.sizeMax - config.sizeMin) * random();
      const startX = -sizeValue - random() * (width * 0.25);
      const startY = config.yMin + random() * (config.yMax - config.yMin);
      const duration = config.durationMin + (config.durationMax - config.durationMin) * random();
      const delay = -duration * random();
      const opacity = config.opacityMin + (config.opacityMax - config.opacityMin) * random();
      const variantIndex = Math.floor(random() * variants.length);
      const driftMultiplier = 0.6 + random() * 0.4;
      const endX = width + sizeValue + random() * (width * 0.25);
      const endY = Math.min(startY + config.driftY * driftMultiplier, height * 0.5);
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
  }, [uid, width, height, size, compact]);

  const character = useMemo(() => {
    if (size === 'mini' || slots.length < 4) return null;
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
    const seed = uid.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + 42;
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

    const points = gridPoints.map((grid) => isoPoint(grid.x, grid.y));
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
    const keyTimesArray = frames.map((_, index) => index / (frames.length - 1));
    const valuesX = frames.map((point) => point.x).join(';');
    const valuesY = frames.map((point) => point.y).join(';');
    const keyTimes = keyTimesArray.join(';');
    const duration = 18 + random() * 10;
    const delay = -duration * random();
    const sizeValue = 30 + random() * 8;
    return {
      duration,
      delay,
      size: sizeValue,
      valuesX,
      valuesY,
      keyTimes,
      keyTimesArray,
      framePoints: frames,
      directionFrames
    };
  }, [uid, size, slots, slotStep, topY, centerX]);

  const chatTranslateValues = useMemo(() => {
    if (!character) return null;
    return character.framePoints
      .map((point) => `${point.x + character.size * 0.2} ${point.y - character.size - 10}`)
      .join(';');
  }, [character]);

  const bumpEvents = useMemo(() => {
    if (manualActive) return [];
    if (!character || itemPlacements.length === 0) return [];
    const reactionPool = ['❤', '😊', '✨', '😋', '⭐', '💛'];
    const seed = uid.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + itemPlacements.length * 13;
    let value = seed + 0x9e3779b9;
    const random = () => {
      value += 0x9e3779b9;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const threshold = slotStep * 0.9;
    const events: { keyTime: number; message: string }[] = [];

    itemPlacements.forEach((placement, index) => {
      let nearestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      character.framePoints.forEach((point, pointIndex) => {
        const dx = point.x - placement.point.x;
        const dy = point.y - placement.point.y;
        const distance = Math.hypot(dx, dy);
        if (distance < bestDistance) {
          bestDistance = distance;
          nearestIndex = pointIndex;
        }
      });
      if (bestDistance <= threshold && random() > 0.35) {
        const itemReaction = ITEM_REACTIONS[placement.item.itemId as ForestItemId];
        events.push({
          keyTime: character.keyTimesArray[nearestIndex] ?? 0,
          message: itemReaction ?? reactionPool[Math.floor(random() * reactionPool.length)]
        });
      }
    });

    if (events.length === 0) {
      const fallbackCount = Math.min(3, itemPlacements.length);
      for (let i = 0; i < fallbackCount; i += 1) {
        events.push({
          keyTime: random(),
          message: reactionPool[Math.floor(random() * reactionPool.length)]
        });
      }
    }

    const seen = new Set<number>();
    const unique = events.filter((event) => {
      const rounded = Math.round(event.keyTime * 100) / 100;
      if (seen.has(rounded)) return false;
      seen.add(rounded);
      return true;
    });

    return unique.sort((a, b) => a.keyTime - b.keyTime).slice(0, 3);
  }, [character, itemPlacements, manualActive, slotStep, uid]);

  const buildBubbleKeyTimes = (keyTime: number) => {
    const window = 0.12;
    const fade = 0.03;
    const start = Math.max(0, keyTime - window / 2);
    const end = Math.min(1, keyTime + window / 2);
    const fadeIn = Math.min(1, start + fade);
    const fadeOut = Math.min(1, end + fade);
    return {
      values: '0;0;1;1;0;0',
      keyTimes: `0;${start.toFixed(3)};${fadeIn.toFixed(3)};${end.toFixed(3)};${fadeOut.toFixed(3)};1`
    };
  };

  const staticAvatarMap: Partial<Record<Kid['avatar'], string>> = {
    fork: forkPng,
    spoon: spoonPng,
    knife: knifePng,
    peanutButterCup: peanutButterCupPng,
    sourPatchKid: sourPatchKidPng,
    hersheyChocolateBar: hersheyChocolateBarPng,
    gummybear: gummybearPng
  };

  const manualAvatarSize = character?.size ?? (size === 'mini' ? 22 : 30);
  const manualPosition = manualAvatar?.position ?? { x: centerX, y: centerY };
  const clampToTop = (pos: { x: number; y: number }) => {
    const margin = manualAvatarSize * 0.6;
    const halfWidth = Math.max(8, topWidth / 2 - margin);
    const halfHeight = Math.max(8, topHeight / 2 - margin);
    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    const nx = Math.abs(dx) / halfWidth;
    const ny = Math.abs(dy) / halfHeight;
    if (nx + ny <= 1) return pos;
    const scale = 1 / (nx + ny);
    return {
      x: centerX + dx * scale,
      y: centerY + dy * scale
    };
  };
  const bubbleOffset = { x: manualAvatarSize * 0.2, y: -manualAvatarSize - 10 };
  const manualBubbleTransform = `translate(${manualPosition.x + bubbleOffset.x} ${manualPosition.y + bubbleOffset.y})`;

  const getSvgPoint = (event: React.PointerEvent<SVGSVGElement> | React.PointerEvent<SVGGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inverted = ctm.inverse();
    const svgPoint = pt.matrixTransform(inverted);
    return { x: svgPoint.x, y: svgPoint.y };
  };

  const handleManualPointerDown = (event: React.PointerEvent<SVGGElement>) => {
    if (!manualActive || !manualAvatar?.onChange) return;
    if (event.button !== 0) return;
    event.preventDefault();
    dragRef.current = { pointerId: event.pointerId };
    svgRef.current?.setPointerCapture?.(event.pointerId);
    const point = getSvgPoint(event);
    if (point) {
      manualAvatar.onChange(clampToTop(point));
    }
  };

  const handleManualPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!manualActive || !manualAvatar?.onChange) return;
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const point = getSvgPoint(event);
    if (point) {
      manualAvatar.onChange(clampToTop(point));
    }
  };

  const handleManualPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    svgRef.current?.releasePointerCapture?.(event.pointerId);
  };


  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Forest island"
      onPointerMove={handleManualPointerMove}
      onPointerUp={handleManualPointerUp}
      onPointerCancel={handleManualPointerUp}
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6886f0" />
          <stop offset="55%" stopColor="#5f7fe6" />
          <stop offset="100%" stopColor="#5b73db" />
        </linearGradient>
        <linearGradient id={`grass-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9f59a" />
          <stop offset="45%" stopColor="#a7e46f" />
          <stop offset="100%" stopColor="#7fc854" />
        </linearGradient>
        <linearGradient id={`soil-left-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#915a2d" />
          <stop offset="100%" stopColor="#70401f" />
        </linearGradient>
        <linearGradient id={`soil-right-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4a26" />
          <stop offset="100%" stopColor="#5d341a" />
        </linearGradient>
        <radialGradient id={`grass-glow-${uid}`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#dffbb7" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#b8ee84" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7fc854" stopOpacity="0" />
        </radialGradient>
        <filter id={`soft-shadow-${uid}`} x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="20" stdDeviation="18" floodColor="#2a3b73" floodOpacity="0.35" />
        </filter>
        <clipPath id={`top-clip-${uid}`}>
          <polygon points={topPoints} />
        </clipPath>
      </defs>

      <rect width={width} height={height} fill={`url(#sky-${uid})`} rx={size === 'mini' ? 18 : 32} />

      <ellipse
        cx={centerX}
        cy={centerY + topHeight / 2 + depth + 12}
        rx={topWidth * 0.46}
        ry={size === 'mini' ? 18 : 26}
        fill="#2c3a73"
        opacity={0.35}
      />

      <g className={size === 'mini' ? undefined : 'animate-float'}>
        <g filter={`url(#soft-shadow-${uid})`}>
          <polygon points={leftSidePoints} fill={`url(#soil-left-${uid})`} />
          <polygon points={rightSidePoints} fill={`url(#soil-right-${uid})`} />
          <polygon points={topPoints} fill={`url(#grass-${uid})`} />
          <polygon points={topPoints} fill={`url(#grass-glow-${uid})`} />
          <polyline
            points={topPoints}
            fill="none"
            stroke="#e0fbb6"
            strokeOpacity={0.6}
            strokeWidth={2}
          />
        </g>

        {grassSprigs.map((slot, index) => {
          const sprig = isoPoint(slot.x, slot.y);
          return (
            <path
              key={`sprig-${index}`}
              d={`M ${sprig.x} ${sprig.y} l -8 -6`}
              stroke="#84c45c"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}

        <g pointerEvents={placement?.active ? 'none' : 'auto'}>
          {itemPlacements.map(({ item, point }) => {
            const { x, y } = point;
            return (
              <ForestItemSvg
                key={item.id}
                itemId={item.itemId as ForestItemId}
                x={x}
                y={y}
                scale={itemScale}
                title={item.tooltip}
                interactive={Boolean(onItemSelect)}
                selected={selectedItemId === item.id}
                onClick={onItemSelect ? () => onItemSelect(item) : undefined}
              />
            );
          })}
        </g>
      </g>

      {placement?.active ? (
        <g clipPath={`url(#top-clip-${uid})`}>
          {slots.map((slot, index) => {
            if (placement.filledSlots.includes(index)) return null;
            const { x, y } = isoPoint(slot.x, slot.y);
            const halfWidth = slotStep * 0.5;
            const halfHeight = slotStep * 0.25;
            const isHovered = hoveredSlot === index;
            return (
              <polygon
                key={`slot-${index}`}
                points={
                  `${x},${y - halfHeight} ` +
                  `${x + halfWidth},${y} ` +
                  `${x},${y + halfHeight} ` +
                  `${x - halfWidth},${y}`
                }
                fill={isHovered ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.18)'}
                stroke={isHovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)'}
                strokeWidth={1}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredSlot(index)}
                onMouseLeave={() => setHoveredSlot(null)}
                onClick={() => placement.onSelect(index)}
              />
            );
          })}
        </g>
      ) : null}

      {manualActive ? (
        <g
          transform={`translate(${manualPosition.x} ${manualPosition.y})`}
          data-forest-avatar="true"
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={handleManualPointerDown}
        >
          <image
            href={
              characterAvatar === 'character'
                ? characterDownRightPng
                : staticAvatarMap[characterAvatar] ?? forkPng
            }
            width={manualAvatarSize}
            height={manualAvatarSize}
            x={-manualAvatarSize / 2}
            y={-manualAvatarSize}
            opacity={0.95}
            className="forest-avatar"
          />
        </g>
      ) : character ? (
        <g pointerEvents={placement?.active ? 'none' : 'auto'}>
          {chatTranslateValues ? (
            <>
              {bumpEvents.length > 0 ? (
                bumpEvents.map((event, index) => {
                  const timing = buildBubbleKeyTimes(event.keyTime);
                  return (
                    <g key={`bump-${index}`} opacity={0}>
                      <animateTransform
                        attributeName="transform"
                        type="translate"
                        values={chatTranslateValues}
                        keyTimes={character.keyTimes}
                        dur={`${character.duration}s`}
                        repeatCount="indefinite"
                        begin={`${character.delay}s`}
                      />
                      <animate
                        attributeName="opacity"
                        values={timing.values}
                        keyTimes={timing.keyTimes}
                        dur={`${character.duration}s`}
                        repeatCount="indefinite"
                        begin={`${character.delay}s`}
                      />
                      <rect x={0} y={0} width={26} height={16} rx={6} fill="rgba(255,255,255,0.95)" />
                      <text
                        x={13}
                        y={11}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#4d7f5d"
                      >
                        {event.message}
                      </text>
                    </g>
                  );
                })
              ) : (
                <g opacity={0}>
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values={chatTranslateValues}
                    keyTimes={character.keyTimes}
                    dur={`${character.duration}s`}
                    repeatCount="indefinite"
                    begin={`${character.delay}s`}
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0;1;1;0;0"
                    keyTimes="0;0.45;0.5;0.65;0.7;1"
                    dur={`${character.duration}s`}
                    repeatCount="indefinite"
                    begin={`${character.delay}s`}
                  />
                  <rect x={0} y={0} width={26} height={16} rx={6} fill="rgba(255,255,255,0.95)" />
                  <circle cx={7} cy={8} r={2} fill="#6dc888" />
                  <circle cx={13} cy={8} r={2} fill="#6dc888" />
                  <circle cx={19} cy={8} r={2} fill="#6dc888" />
                </g>
              )}
              {bubbleMessage
                ? [
                    (() => {
                      const scale = bubbleScale ?? 1.4;
                      const bubbleWidth = 26 * scale;
                      const bubbleHeight = 16 * scale;
                      const bubbleRadius = 6 * scale;
                      const bubbleFont = 10 * scale;
                      const bubbleTextY = bubbleHeight * 0.72;
                      return (
                        <g key={`bubble-${bubbleKey ?? bubbleMessage}`} opacity={1}>
                          <animateTransform
                            attributeName="transform"
                            type="translate"
                            values={chatTranslateValues}
                            keyTimes={character.keyTimes}
                            dur={`${character.duration}s`}
                            repeatCount="indefinite"
                            begin={`${character.delay}s`}
                          />
                          <rect
                            x={0}
                            y={0}
                            width={bubbleWidth}
                            height={bubbleHeight}
                            rx={bubbleRadius}
                            fill="rgba(255,255,255,0.98)"
                            stroke="#6dc888"
                            strokeWidth={Math.max(1, 1.1 * scale)}
                          />
                          <text
                            x={bubbleWidth / 2}
                            y={bubbleTextY}
                            textAnchor="middle"
                            fontSize={bubbleFont}
                            fill="#2f6b52"
                          >
                            {bubbleMessage}
                          </text>
                        </g>
                      );
                    })()
                  ]
                : null}
            </>
          ) : null}
          {characterAvatar === 'character' ? (
            ([
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
                className="forest-avatar"
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
            ))
          ) : (
            <image
              href={staticAvatarMap[characterAvatar] ?? forkPng}
              width={character.size}
              height={character.size}
              x={-character.size / 2}
              y={-character.size}
              opacity={0.95}
              className="forest-avatar"
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
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 -2; 0 0"
                dur="3.6s"
                repeatCount="indefinite"
                additive="sum"
              />
            </image>
          )}
        </g>
      ) : null}

      {manualActive && bubbleMessage ? (
        <g transform={manualBubbleTransform}>
          {(() => {
            const scale = bubbleScale ?? 1.4;
            const bubbleWidth = 26 * scale;
            const bubbleHeight = 16 * scale;
            const bubbleRadius = 6 * scale;
            const bubbleFont = 10 * scale;
            const bubbleTextY = bubbleHeight * 0.72;
            return (
              <>
                <rect
                  x={0}
                  y={0}
                  width={bubbleWidth}
                  height={bubbleHeight}
                  rx={bubbleRadius}
                  fill="rgba(255,255,255,0.98)"
                  stroke="#6dc888"
                  strokeWidth={Math.max(1, 1.1 * scale)}
                />
                <text
                  x={bubbleWidth / 2}
                  y={bubbleTextY}
                  textAnchor="middle"
                  fontSize={bubbleFont}
                  fill="#2f6b52"
                >
                  {bubbleMessage}
                </text>
              </>
            );
          })()}
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
          pointerEvents="none"
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

export default ForestIslandSvg;
