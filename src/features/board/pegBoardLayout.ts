// Pure geometry for the peg board, modeled on the classic continuous
// ("Bicycle"-style) board laid on its side: the start run goes left-to-right
// across the top (holes 1-30), a big curve on the right (31-50) turns into the
// bottom run going right-to-left (51-80), a small U-turn on the left (81-90)
// leads into the center run going left-to-right (91-120), which finishes at
// the 121 game hole inside the big curve. Each track has its own concentric
// lane; the first track is always the outer lane.

export const GAME_HOLE = 121;
export const GROUP_SIZE = 5;

export interface Point {
  x: number;
  y: number;
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
  laneWidth: number;
  /** SVG path for each lane's tinted band. */
  lanePaths: string[];
  /** Hole centers per lane, index 0 = hole 1. */
  holes: Point[][];
  laneLabels: Point[];
  startXY(trackIndex: number): Point;
  gameHoleXY(): Point;
  gameMark: Point;
  /** Position for a cumulative score (0-121) on a lane. */
  scoreXY(score: number, trackIndex: number): Point;
  /** Dashed lines across all lanes after holes 60 and 90. */
  skunkTicks: Array<Tick & { after: number; label: Point }>;
  /** Hole numbers every 5. */
  marks: Mark[];
}

const STRAIGHT_HOLES = 30;
const BIG_CURVE_HOLES = 20;
const SMALL_CURVE_HOLES = 10;
const PITCH = 8;
const GROUP_GAP = 4;
const BIG_RADIUS = 64;
const SMALL_RADIUS = BIG_RADIUS / 2;
const HOLE_RADIUS = 2.6;
const PAD = 6;
const LABEL_ROW = 12;
const MARK_GAP = 7;

export function laneSpacing(trackCount: number): number {
  return trackCount >= 3 ? 12 : 13;
}

/** Offsets from the centerline toward the outside of the loop; lane 0 is outermost. */
export function laneOffsets(trackCount: number): number[] {
  const s = laneSpacing(trackCount);
  return Array.from({ length: trackCount }, (_, k) => ((trackCount - 1) / 2 - k) * s);
}

/** Distance of straight-run hole i (0-based) from the run's first hole, with a gap every 5. */
function along(i: number): number {
  return i * PITCH + Math.floor(i / GROUP_SIZE) * GROUP_GAP;
}

const deg = (d: number) => (d * Math.PI) / 180;

export function buildLayout(trackCount: number): PegBoardLayout {
  const offsets = laneOffsets(trackCount);
  const s = laneSpacing(trackCount);
  const ext = offsets[0] + s / 2;
  const R = BIG_RADIUS;
  const r = SMALL_RADIUS;
  const runLength = along(STRAIGHT_HOLES - 1);

  const xU = PAD + r + ext;
  const xR = xU + PITCH + runLength;
  const yA = PAD + LABEL_ROW + ext;
  const yC = yA + R;
  const yB = yA + 2 * R;
  const yD = yC + r;
  const vbW = xR + R + ext + PAD;
  const vbH = yB + ext + LABEL_ROW + PAD;

  const runA = (i: number, off: number): Point => ({ x: xU + PITCH / 2 + along(i), y: yA - off });
  const runB = (i: number, off: number): Point => ({ x: xR - PITCH / 2 - along(i), y: yB + off });
  const runC = (i: number, off: number): Point => ({ x: xU + PITCH / 2 + along(i), y: yC - off });
  const bigCurve = (k: number, off: number): Point => {
    const theta = deg(-90 + ((k + 0.5) * 180) / BIG_CURVE_HOLES);
    return { x: xR + (R + off) * Math.cos(theta), y: yC + (R + off) * Math.sin(theta) };
  };
  const smallCurve = (k: number, off: number): Point => {
    const theta = deg(90 + ((k + 0.5) * 180) / SMALL_CURVE_HOLES);
    return { x: xU + (r + off) * Math.cos(theta), y: yD + (r + off) * Math.sin(theta) };
  };

  /** Hole n (1-120) on the lane at `off`. */
  const holeAt = (n: number, off: number): Point => {
    if (n <= 30) return runA(n - 1, off);
    if (n <= 50) return bigCurve(n - 31, off);
    if (n <= 80) return runB(n - 51, off);
    if (n <= 90) return smallCurve(n - 81, off);
    return runC(n - 91, off);
  };

  const holes = offsets.map((off) => Array.from({ length: 120 }, (_, i) => holeAt(i + 1, off)));

  const startX = xU + PITCH / 2 - 2.25 * PITCH;
  const startXY = (trackIndex: number): Point => ({ x: startX, y: yA - offsets[trackIndex] });
  const game: Point = { x: xR + 16, y: yC };
  const gameHoleXY = () => game;

  const scoreXY = (score: number, trackIndex: number): Point => {
    if (score <= 0) return startXY(trackIndex);
    if (score >= GAME_HOLE) return game;
    return holes[trackIndex][score - 1];
  };

  const lanePaths = offsets.map((off) => {
    const rb = R + off;
    const rs = r + off;
    const endC = xR - PITCH / 2 + PITCH / 2;
    return [
      `M ${startX - PITCH / 2} ${yA - off}`,
      `L ${xR} ${yA - off}`,
      `A ${rb} ${rb} 0 0 1 ${xR} ${yB + off}`,
      `L ${xU} ${yB + off}`,
      `A ${rs} ${rs} 0 0 1 ${xU} ${yC - off}`,
      `L ${endC} ${yC - off}`,
    ].join(' ');
  });

  const reach = ext + 2;
  const tick60x = xR - PITCH / 2 - (along(9) + along(10)) / 2;
  const skunkTicks = [
    {
      after: 60,
      from: { x: tick60x, y: yB - reach },
      to: { x: tick60x, y: yB + reach },
      label: { x: tick60x, y: yB - ext - MARK_GAP },
    },
    {
      after: 90,
      from: { x: xU, y: yC - reach },
      to: { x: xU, y: yC + reach },
      label: { x: xU + 20, y: yC + ext + MARK_GAP },
    },
  ];

  const marks: Mark[] = [];
  for (let n = 5; n <= 120; n += 5) {
    const hole = holeAt(n, 0);
    if (n <= 30) marks.push({ value: n, x: hole.x, y: yA - ext - MARK_GAP });
    else if (n <= 50) {
      const theta = deg(-90 + ((n - 31 + 0.5) * 180) / BIG_CURVE_HOLES);
      const rr = R - ext - MARK_GAP - 2;
      marks.push({ value: n, x: xR + rr * Math.cos(theta), y: yC + rr * Math.sin(theta) });
    } else if (n <= 80) marks.push({ value: n, x: hole.x, y: yB + ext + MARK_GAP });
    else if (n > 90) marks.push({ value: n, x: hole.x, y: yC - ext - MARK_GAP });
  }

  const laneLabels = offsets.map((off) => ({ x: startX - 12, y: yA - off }));

  return {
    trackCount,
    vbW,
    vbH,
    holeRadius: HOLE_RADIUS,
    gameHoleRadius: 6,
    laneWidth: s,
    lanePaths,
    holes,
    laneLabels,
    startXY,
    gameHoleXY,
    gameMark: { x: game.x, y: game.y - 13 },
    scoreXY,
    skunkTicks,
    marks,
  };
}
