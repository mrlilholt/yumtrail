import { CSSProperties } from 'react';
import { ForestItemId, getForestItemById } from '../lib/forestCatalog';

type ForestItemSvgProps = {
  itemId: ForestItemId;
  x: number;
  y: number;
  scale?: number;
  title?: string;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
};

const ForestItemSvg = ({
  itemId,
  x,
  y,
  scale = 1,
  title,
  interactive = false,
  selected = false,
  onClick
}: ForestItemSvgProps) => {
  const renderItem = () => {
    const catalog = getForestItemById(itemId);
    if (catalog?.image) {
      const scaleValue = catalog.imageScale ?? 1;
      const offset = catalog.imageOffset ?? { x: 0, y: 0 };
      const size = 36 * scaleValue;
      return (
        <image
          href={catalog.image}
          x={-size / 2 + offset.x}
          y={-size / 2 + offset.y}
          width={size}
          height={size}
          preserveAspectRatio="xMidYMid meet"
        />
      );
    }

    switch (itemId) {
      case 'roundTree':
        return (
          <g>
            <ellipse cx={0} cy={18} rx={16} ry={6} fill="#395232" opacity={0.35} />
            <rect x={-4} y={4} width={8} height={14} rx={2} fill="#8a5a32" />
            <circle cx={0} cy={-4} r={14} fill="#8ed260" />
            <circle cx={-10} cy={2} r={9} fill="#79bc4f" />
            <circle cx={10} cy={2} r={8} fill="#9fe072" />
            <circle cx={2} cy={-12} r={6} fill="#c7f4a0" />
          </g>
        );
      case 'pineTree':
        return (
          <g>
            <ellipse cx={0} cy={18} rx={12} ry={5} fill="#35502f" opacity={0.35} />
            <rect x={-3} y={6} width={6} height={12} rx={2} fill="#7f4e2a" />
            <path d="M 0 -16 L -12 6 L 12 6 Z" fill="#7ac65a" />
            <path d="M 0 -24 L -8 -2 L 8 -2 Z" fill="#93de72" />
          </g>
        );
      case 'bloomTree':
        return (
          <g>
            <ellipse cx={0} cy={18} rx={16} ry={6} fill="#35502f" opacity={0.3} />
            <rect x={-4} y={5} width={8} height={13} rx={2} fill="#8f5b35" />
            <circle cx={0} cy={-4} r={13} fill="#9fdf72" />
            <circle cx={-10} cy={0} r={8} fill="#f4a1c6" />
            <circle cx={10} cy={0} r={7} fill="#f8b4d5" />
            <circle cx={0} cy={-12} r={6} fill="#f7c5df" />
          </g>
        );
      case 'berryBush':
        return (
          <g>
            <ellipse cx={0} cy={14} rx={12} ry={5} fill="#35502f" opacity={0.3} />
            <circle cx={-8} cy={6} r={7} fill="#8acc5f" />
            <circle cx={0} cy={6} r={9} fill="#7bb84f" />
            <circle cx={8} cy={8} r={6} fill="#9ddd6a" />
            <circle cx={-4} cy={4} r={2} fill="#f06292" />
            <circle cx={4} cy={6} r={2} fill="#f06292" />
          </g>
        );
      case 'mushroomPatch':
        return (
          <g>
            <ellipse cx={0} cy={16} rx={12} ry={5} fill="#35502f" opacity={0.28} />
            <rect x={-10} y={4} width={4} height={8} rx={2} fill="#f7e6cf" />
            <rect x={-1} y={6} width={4} height={8} rx={2} fill="#f7e6cf" />
            <rect x={6} y={5} width={4} height={8} rx={2} fill="#f7e6cf" />
            <ellipse cx={-8} cy={4} rx={6} ry={4} fill="#e7b056" />
            <ellipse cx={1} cy={6} rx={7} ry={4} fill="#f2c064" />
            <ellipse cx={8} cy={5} rx={5} ry={3} fill="#e7b056" />
          </g>
        );
      case 'sunflowerPatch':
        return (
          <g>
            <ellipse cx={0} cy={16} rx={12} ry={5} fill="#35502f" opacity={0.28} />
            <path d="M -6 10 L -6 0" stroke="#6fb24a" strokeWidth={2} strokeLinecap="round" />
            <path d="M 0 12 L 0 2" stroke="#6fb24a" strokeWidth={2} strokeLinecap="round" />
            <path d="M 6 10 L 6 1" stroke="#6fb24a" strokeWidth={2} strokeLinecap="round" />
            <circle cx={-6} cy={-2} r={4} fill="#f9cf68" />
            <circle cx={0} cy={0} r={4} fill="#f4b84e" />
            <circle cx={6} cy={-2} r={4} fill="#f9cf68" />
          </g>
        );
      case 'flowerRing':
        return (
          <g>
            <ellipse cx={0} cy={16} rx={14} ry={6} fill="#35502f" opacity={0.25} />
            <circle cx={0} cy={6} r={9} fill="#9ddd6a" />
            <circle cx={0} cy={6} r={6} fill="#6fb24a" />
            <circle cx={-8} cy={2} r={2} fill="#f9cf68" />
            <circle cx={8} cy={4} r={2} fill="#f9cf68" />
            <circle cx={0} cy={-2} r={2} fill="#f4a1c6" />
            <circle cx={-2} cy={12} r={2} fill="#f4a1c6" />
          </g>
        );
      case 'rockGarden':
        return (
          <g>
            <ellipse cx={0} cy={16} rx={14} ry={6} fill="#35502f" opacity={0.25} />
            <ellipse cx={-6} cy={8} rx={6} ry={4} fill="#c2b9b1" />
            <ellipse cx={2} cy={10} rx={7} ry={5} fill="#b0a59b" />
            <ellipse cx={10} cy={8} rx={5} ry={3} fill="#d0c6bd" />
          </g>
        );
      case 'tinyPond':
        return (
          <g>
            <ellipse cx={0} cy={14} rx={18} ry={9} fill="#7dc0d6" opacity={0.85} />
            <ellipse cx={-4} cy={12} rx={8} ry={4} fill="#a4deee" opacity={0.85} />
            <circle cx={6} cy={12} r={2} fill="#f2c064" />
          </g>
        );
      case 'campfire':
        return (
          <g>
            <ellipse cx={0} cy={16} rx={12} ry={5} fill="#35502f" opacity={0.25} />
            <rect x={-10} y={10} width={20} height={4} rx={2} fill="#8a5a32" />
            <rect x={-8} y={8} width={16} height={4} rx={2} fill="#7a4a26" />
            <path d="M 0 -2 C -4 2 -4 6 0 10 C 4 6 4 2 0 -2 Z" fill="#f9cf68" />
            <path d="M 0 0 C -2 2 -2 4 0 6 C 2 4 2 2 0 0 Z" fill="#f2804f" />
          </g>
        );
      case 'bench':
        return (
          <g>
            <ellipse cx={0} cy={16} rx={14} ry={5} fill="#35502f" opacity={0.25} />
            <rect x={-12} y={8} width={24} height={6} rx={2} fill="#c99a5f" />
            <rect x={-10} y={4} width={20} height={4} rx={2} fill="#d5ac6d" />
            <rect x={-8} y={12} width={3} height={6} rx={1} fill="#9a6b3f" />
            <rect x={5} y={12} width={3} height={6} rx={1} fill="#9a6b3f" />
          </g>
        );
      case 'trailSign':
        return (
          <g>
            <ellipse cx={0} cy={16} rx={10} ry={4} fill="#35502f" opacity={0.25} />
            <rect x={-3} y={6} width={6} height={12} rx={2} fill="#86552f" />
            <rect x={-14} y={0} width={28} height={10} rx={3} fill="#f8d58a" />
            <path d="M -6 3 L 6 3" stroke="#c9952f" strokeWidth={2} strokeLinecap="round" />
          </g>
        );
      case 'lanternPost':
        return (
          <g>
            <ellipse cx={0} cy={16} rx={10} ry={4} fill="#35502f" opacity={0.25} />
            <rect x={-3} y={4} width={6} height={14} rx={2} fill="#7a4a26" />
            <rect x={-7} y={0} width={14} height={10} rx={3} fill="#f5cc6f" />
            <circle cx={0} cy={5} r={4} fill="#ffe4a6" className="animate-glow" />
          </g>
        );
      case 'cabin':
        return (
          <g>
            <ellipse cx={0} cy={18} rx={16} ry={6} fill="#35502f" opacity={0.25} />
            <rect x={-12} y={6} width={24} height={14} rx={3} fill="#d2a777" />
            <rect x={-4} y={12} width={8} height={8} rx={2} fill="#8a5a32" />
            <path d="M -14 6 L 0 -6 L 14 6 Z" fill="#b5723b" />
            <rect x={-2} y={9} width={4} height={4} rx={1} fill="#ffe4a6" />
          </g>
        );
      case 'marketStall':
        return (
          <g>
            <ellipse cx={0} cy={18} rx={16} ry={6} fill="#35502f" opacity={0.25} />
            <rect x={-12} y={8} width={24} height={12} rx={3} fill="#e7d7c5" />
            <rect x={-12} y={2} width={24} height={8} rx={3} fill="#f2c064" />
            <path d="M -12 2 L -8 10" stroke="#d08f3f" strokeWidth={2} />
            <path d="M 12 2 L 8 10" stroke="#d08f3f" strokeWidth={2} />
            <rect x={-2} y={12} width={4} height={6} rx={1} fill="#b68455" />
          </g>
        );
      case 'windmill':
        return (
          <g>
            <ellipse cx={0} cy={18} rx={16} ry={6} fill="#35502f" opacity={0.25} />
            <rect x={-5} y={4} width={10} height={16} rx={3} fill="#e7d7c5" />
            <circle cx={0} cy={2} r={4} fill="#f2c064" />
            <path d="M 0 -10 L 0 2" stroke="#f2c064" strokeWidth={2} />
            <path d="M -10 2 L 0 2" stroke="#f2c064" strokeWidth={2} />
            <path d="M 0 2 L 10 2" stroke="#f2c064" strokeWidth={2} />
            <path d="M 0 2 L 0 12" stroke="#f2c064" strokeWidth={2} />
          </g>
        );
      case 'statue':
        return (
          <g>
            <ellipse cx={0} cy={18} rx={14} ry={6} fill="#35502f" opacity={0.25} />
            <rect x={-8} y={8} width={16} height={10} rx={3} fill="#cfd6dd" />
            <rect x={-5} y={2} width={10} height={8} rx={2} fill="#dfe6ee" />
            <path d="M 0 -6 L 3 0 L -3 0 Z" fill="#f2c064" />
          </g>
        );
      default:
        return null;
    }
  };

  const itemStyle = { '--item-scale': scale } as CSSProperties;

  return (
    <g
      transform={`translate(${x} ${y})`}
      data-forest-item={interactive ? 'true' : undefined}
      onClick={onClick}
      className={interactive ? 'cursor-pointer' : undefined}
    >
      {selected ? <ellipse cx={0} cy={16} rx={20} ry={8} fill="#fff2a6" opacity={0.6} /> : null}
      <g className="forest-item" style={itemStyle}>
        {title ? <title>{title}</title> : null}
        {renderItem()}
      </g>
    </g>
  );
};

export default ForestItemSvg;
