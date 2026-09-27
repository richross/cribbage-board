// Pure geometry for the peg board: a continuous "racetrack" — one lap of 120
// holes (grouped in fives) around a rounded rectangle, one concentric lane per
// track (first track outermost), with start holes and a single shared 121
// game hole in the gap at the bottom center. The lap runs clockwise from the
// bottom center: left along the bottom, up the left side, across the top,
// down the right side, and back along the bottom to the finish.

export const LAP_HOLES = 120;
export const GROUP_SIZE = 5;
export const GAME_HOLE = 121;
export const SKUNK_AFTER = [60, 90] as const;

export interface Point {
  x: number;
  y: number;
}

interface PathPoint extends Point {
  /** Outward unit normal. */
  nx: number;
  ny: number;
}

export interface Tick {
  from: Point;
  to: Point;
}

export interface Mark extends Point {
  value: number;
}

export interface PegBoardLayout {
  trackCount: number;
  vbW: number;
  vbH: number;
  holeRadius: number;
  gameHoleRadius: number;
  /** Hole centers per lane, index 0 = hole 1. */
  holes: Point[][];
  startXY(trackIndex: number): Point;
  gameHoleXY(): Point;
  /** Position for a cumulative score (0-121) on a lane. */
  scoreXY(score: number, trackIndex: number): Point;
  /** Dashed lines across all lanes after holes 60 and 90. */
  skunkTicks: Array<Tick & { after: number; label: Point }>;
  /** Solid line across all lanes separating the finish from the start. */
  finishTick: Tick;
  /** Hole numbers every 10, just inside the track. */
  marks: Mark[];
  /** Open area in the middle of the oval, for a legend. */
  infield: { x: number; y: number; w: number; h: number };
}

export const VIEWBOX_WIDTH = 360;
const HALF_HEIGHT = 135;
const CORNER = 34;
const PAD = 10;
const LANE_SPACING = 13;
const HOLE_RADIUS = 2.8;
const GROUP_GAP = 0.6; // extra spacing between groups, as a fraction of the pitch
const GAP_BEFORE_START = 2; // gap (in pitches) from the bottom center to hole 1
const GAP_AFTER_FINISH = 3; // gap (in pitches) from hole 120 back to the bottom center
const MARK_INSET = 10;

/** Lane offsets from the centerline, outward positive; lane 0 is outermost. */
export function laneOffsets(trackCount: number): number[] {
  return Array.from({ length: trackCount }, (_, k) => ((trackCount - 1) / 2 - k) * LANE_SPACING);
}

export function buildLayout(trackCount: number): PegBoardLayout {
  const offsets = laneOffsets(trackCount);
  const extent = offsets[0] + HOLE_RADIUS;
  const vbW = VIEWBOX_WIDTH;
  const a = vbW / 2 - PAD - extent - 4;
  const b = HALF_HEIGHT;
  const vbH = 2 * (b + extent + 4 + PAD);
  const cx = vbW / 2;
  const cy = vbH / 2;
  const r = CORNER;
  const straightX = a - r;
  const straightY = 2 * (b - r);
  const arc = (Math.PI * r) / 2;

  type Segment = { len: number; at: (t: number) => PathPoint };
  const line = (x0: number, y0: number, dx: number, dy: number, nx: number, ny: number, len: number): Segment => ({
    len,
    at: (t) => ({ x: x0 + dx * t, y: y0 + dy * t, nx, ny }),
  });
  const bend = (ox: number, oy: number, fromDeg: number): Segment => ({
    len: arc,
    at: (t) => {
      const theta = ((fromDeg + (t / arc) * 90) * Math.PI) / 180;
      const nx = Math.cos(theta);
      const ny = Math.sin(theta);
      return { x: ox + r * nx, y: oy + r * ny, nx, ny };
    },
  });

  const segments: Segment[] = [
    line(cx, cy + b, -1, 0, 0, 1, straightX),
    bend(cx - a + r, cy + b - r, 90),
    line(cx - a, cy + b - r, 0, -1, -1, 0, straightY),
    bend(cx - a + r, cy - b + r, 180),
    line(cx - a + r, cy - b, 1, 0, 0, -1, 2 * straightX),
    bend(cx + a - r, cy - b + r, 270),
    line(cx + a, cy - b + r, 0, 1, 1, 0, straightY),
    bend(cx + a - r, cy + b - r, 0),
    line(cx + a - r, cy + b, -1, 0, 0, 1, straightX),
  ];
  const perimeter = segments.reduce((sum, s) => sum + s.len, 0);

  const pointAt = (sRaw: number): PathPoint => {
    let s = ((sRaw % perimeter) + perimeter) % perimeter;
    for (const seg of segments) {
      if (s <= seg.len) return seg.at(s);
      s -= seg.len;
    }
    return segments[segments.length - 1].at(segments[segments.length - 1].len);
  };
  const offsetPoint = (s: number, offset: number): Point => {
    const p = pointAt(s);
    return { x: p.x + p.nx * offset, y: p.y + p.ny * offset };
  };

  const groups = LAP_HOLES / GROUP_SIZE;
  const pitch = perimeter / (LAP_HOLES - 1 + (groups - 1) * GROUP_GAP + GAP_BEFORE_START + GAP_AFTER_FINISH);
  const holeS = (index: number) =>
    GAP_BEFORE_START * pitch + index * pitch + Math.floor(index / GROUP_SIZE) * GROUP_GAP * pitch;

  const holes = offsets.map((offset) => Array.from({ length: LAP_HOLES }, (_, i) => offsetPoint(holeS(i), offset)));
  const startS = 0.7 * pitch;
  const gameS = -1.5 * pitch;
  const startXY = (trackIndex: number) => offsetPoint(startS, offsets[trackIndex]);
  const gameHoleXY = () => offsetPoint(gameS, 0);

  const scoreXY = (score: number, trackIndex: number): Point => {
    if (score <= 0) return startXY(trackIndex);
    if (score >= GAME_HOLE) return gameHoleXY();
    return holes[trackIndex][Math.min(score, LAP_HOLES) - 1];
  };

  const across = (s: number, reach: number): Tick => ({ from: offsetPoint(s, -reach), to: offsetPoint(s, reach) });
  const reach = extent + 4;
  const skunkTicks = SKUNK_AFTER.map((after) => {
    const s = (holeS(after - 1) + holeS(after)) / 2;
    return { ...across(s, reach), after, label: offsetPoint(s + 2.2 * pitch, -(extent + 22)) };
  });
  const finishTick = across(-0.4 * pitch, reach);

  const marks: Mark[] = [];
  for (let value = 10; value < LAP_HOLES; value += 10) {
    marks.push({ value, ...offsetPoint(holeS(value - 1), -(extent + MARK_INSET)) });
  }
  marks.push({ value: GAME_HOLE, ...offsetPoint(gameS, -(extent + MARK_INSET)) });

  const inner = extent + MARK_INSET + 44;
  const infield = { x: cx - a + inner, y: cy - b + inner, w: 2 * (a - inner), h: 2 * (b - inner) };

  return {
    trackCount,
    vbW,
    vbH,
    holeRadius: HOLE_RADIUS,
    gameHoleRadius: 6.5,
    holes,
    startXY,
    gameHoleXY,
    scoreXY,
    skunkTicks,
    finishTick,
    marks,
    infield,
  };
}
