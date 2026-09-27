import type { CSSProperties } from 'react';

export type PegShapeKind = 'circle' | 'square' | 'triangle';

export interface PegShapeProps {
  shape: PegShapeKind;
  color: string;
  /** Solid = front peg. Hollow = back peg (outline only). */
  solid?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/**
 * The peg marker: circle (P1/Team 1), square (P2/Team 2), or triangle (P3).
 * The front peg is solid; the back peg is a hollow outline of the same
 * shape, so track identity never rests on color alone.
 */
function PegShape({ shape, color, solid = true, size = 16, className, style, title }: PegShapeProps) {
  const strokeWidth = 2;
  const fill = solid ? color : 'none';
  const stroke = color;

  let inner: JSX.Element;
  switch (shape) {
    case 'square': {
      const inset = strokeWidth;
      const side = size - inset * 2;
      inner = <rect x={inset} y={inset} width={side} height={side} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    }
    case 'triangle': {
      const inset = strokeWidth;
      const points = `${size / 2},${inset} ${size - inset},${size - inset} ${inset},${size - inset}`;
      inner = <polygon points={points} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
      break;
    }
    case 'circle':
    default: {
      const r = size / 2 - strokeWidth;
      inner = <circle cx={size / 2} cy={size / 2} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
      break;
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={style}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {inner}
    </svg>
  );
}

export default PegShape;
