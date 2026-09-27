// Pure geometry for the peg board: where holes and pegs sit, laid out as
// four 30-hole "streets" (1-30, 31-60, 61-90, 91-120) plus a single 121
// game hole, matching a real wooden cribbage board's ruled track.

export const HOLES_PER_STREET = 30;
export const STREET_COUNT = 4;
export const GROUP_SIZE = 5;
export const GAME_HOLE = 121;

export interface HoleLocation {
  /** Street index 0-3 (1-30, 31-60, 61-90, 91-120). */
  street: number;
  /** Index within the street, 0-29. */
  index: number;
}

/** Which street/index a 1-120 hole number falls in. Null for 0 (start) or 121+ (game hole). */
export function holeLocation(hole: number): HoleLocation | null {
  if (hole <= 0 || hole > 120) return null;
  const street = Math.floor((hole - 1) / HOLES_PER_STREET);
  const index = (hole - 1) % HOLES_PER_STREET;
  return { street, index };
}

/** Precomputed x-offsets (in SVG user units) for the 30 holes in a street, with an extra gap every 5. */
export function buildHoleOffsets(holeGap: number, groupGap: number): number[] {
  const offsets: number[] = [];
  let x = 0;
  for (let i = 0; i < HOLES_PER_STREET; i += 1) {
    if (i > 0) {
      x += holeGap + (i % GROUP_SIZE === 0 ? groupGap : 0);
    }
    offsets.push(x);
  }
  return offsets;
}

export interface PegBoardGeometry {
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  laneHeight: number;
  streetGap: number;
  holeGap: number;
  groupGap: number;
}

export const DEFAULT_GEOMETRY: PegBoardGeometry = {
  leftMargin: 34,
  rightMargin: 42,
  topMargin: 14,
  bottomMargin: 14,
  laneHeight: 24,
  streetGap: 20,
  holeGap: 9,
  groupGap: 4,
};

export interface PegBoardLayout {
  geometry: PegBoardGeometry;
  trackCount: number;
  offsets: number[];
  streetWidth: number;
  bandHeight: number;
  vbW: number;
  vbH: number;
  /** Top y of a given street band (0-3). */
  bandTop(street: number): number;
  /** Center y of a track's lane within a given street band. */
  laneY(street: number, trackIndex: number): number;
  /** x for a hole index (0-29) within a street. */
  holeX(index: number): number;
  /** x/y for the start position (score 0) for a track. */
  startXY(trackIndex: number): { x: number; y: number };
  /** x/y for the 121 game hole for a track. */
  gameHoleXY(trackIndex: number): { x: number; y: number };
  /** x/y for a given cumulative score (0-121) for a track. */
  scoreXY(score: number, trackIndex: number): { x: number; y: number };
}

export function buildLayout(trackCount: number, geometry: PegBoardGeometry = DEFAULT_GEOMETRY): PegBoardLayout {
  const offsets = buildHoleOffsets(geometry.holeGap, geometry.groupGap);
  const streetWidth = offsets[offsets.length - 1] + geometry.holeGap;
  const bandHeight = trackCount * geometry.laneHeight + geometry.streetGap;
  const vbW = geometry.leftMargin + streetWidth + geometry.rightMargin;
  const vbH = geometry.topMargin + STREET_COUNT * bandHeight + geometry.bottomMargin;

  const bandTop = (street: number) => geometry.topMargin + street * bandHeight;
  const laneY = (street: number, trackIndex: number) =>
    bandTop(street) + trackIndex * geometry.laneHeight + geometry.laneHeight / 2;
  const holeX = (index: number) => geometry.leftMargin + offsets[index];

  const startXY = (trackIndex: number) => ({ x: geometry.leftMargin / 2, y: laneY(0, trackIndex) });
  const gameHoleXY = (trackIndex: number) => ({
    x: geometry.leftMargin + streetWidth + geometry.rightMargin / 2,
    y: laneY(STREET_COUNT - 1, trackIndex),
  });

  const scoreXY = (score: number, trackIndex: number) => {
    if (score <= 0) return startXY(trackIndex);
    if (score >= GAME_HOLE) return gameHoleXY(trackIndex);
    const loc = holeLocation(Math.min(score, 120));
    if (!loc) return startXY(trackIndex);
    return { x: holeX(loc.index), y: laneY(loc.street, trackIndex) };
  };

  return {
    geometry,
    trackCount,
    offsets,
    streetWidth,
    bandHeight,
    vbW,
    vbH,
    bandTop,
    laneY,
    holeX,
    startXY,
    gameHoleXY,
    scoreXY,
  };
}
