// The peg-board visualization: the classic continuous board on its side —
// a start run across the top, a big curve, a return run along the bottom, a
// small U-turn, and a center run to the 121 game hole — with one colored
// lane per track (first track outermost). Holes and ruled lines are SVG; pegs and every text label are an HTML
// overlay so their real size never shrinks with the viewBox scale. The SVG is
// aria-hidden — the scoring rows are the real input/output, and a
// VisuallyHidden summary carries the same information as text.
import { useEffect, useRef, useState } from 'react';
import type { TrackState } from '../../domain/board';
import PegShape from '../../components/PegShape/PegShape';
import VisuallyHidden from '../../components/VisuallyHidden/VisuallyHidden';
import { trackColorVar } from './colors';
import { buildLayout } from './pegBoardLayout';
import type { PegBoardLayout } from './pegBoardLayout';
import type { UndoSmudge } from './useGame';
import styles from './PegBoard.module.css';

export interface PegBoardProps {
  tracks: TrackState[];
  smudge: UndoSmudge | null;
}

function usePrefersReducedMotion(): boolean {
  const supportsMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [reduced, setReduced] = useState(
    () => supportsMatchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (!supportsMatchMedia) return undefined;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [supportsMatchMedia]);
  return reduced;
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}

/** Animates a track's displayed front-peg position hole-by-hole toward its real score. */
function useAnimatedScore(target: number, reduceMotion: boolean): number {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef<number>();
  const prevTargetRef = useRef(target);

  useEffect(() => {
    if (prevTargetRef.current === target) return undefined;
    const start = prevTargetRef.current;
    prevTargetRef.current = target;

    if (reduceMotion) {
      setDisplay(target);
      return undefined;
    }

    const delta = Math.abs(target - start);
    const duration = Math.min(350, Math.max(120, delta * 18));
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeOutExpo(progress);
      const value = Math.round(start + (target - start) * eased);
      setDisplay(value);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    };
  }, [target, reduceMotion]);

  return display;
}

/** Percentage position string for an overlay element, from viewBox user units. */
function pct(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

/** Rendered-width / viewBox-width, so overlay pegs scale with the holes. */
function useBoardScale(ref: React.RefObject<HTMLDivElement>, vbW: number): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setScale(width / vbW);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, vbW]);
  return scale;
}

function OverlayPeg({
  trackState,
  trackIndex,
  layout,
  color,
  reduceMotion,
  scale,
}: {
  trackState: TrackState;
  trackIndex: number;
  layout: PegBoardLayout;
  color: string;
  reduceMotion: boolean;
  scale: number;
}) {
  const displayScore = useAnimatedScore(trackState.score, reduceMotion);
  const front = layout.scoreXY(displayScore, trackIndex);
  const back = layout.scoreXY(trackState.backPeg, trackIndex);

  return (
    <>
      {trackState.score > 0 ? (
        <div className={styles.peg} style={{ left: pct(back.x, layout.vbW), top: pct(back.y, layout.vbH) }}>
          <PegShape shape={trackState.track.shape} color={color} solid={false} size={Math.round(12 * scale)} />
        </div>
      ) : null}
      <div className={styles.peg} style={{ left: pct(front.x, layout.vbW), top: pct(front.y, layout.vbH) }}>
        <PegShape
          shape={trackState.track.shape}
          color={color}
          solid
          size={Math.round(14 * scale)}
          title={`${trackState.track.label} peg`}
        />
      </div>
    </>
  );
}

function PegBoard({ tracks, smudge }: PegBoardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const layout = buildLayout(tracks.length);
  const { vbW, vbH } = layout;
  const scale = useBoardScale(frameRef, vbW);

  const smudgeTrackIndex = smudge ? tracks.findIndex((t) => t.track.id === smudge.trackId) : -1;
  const smudgeXY = smudge && smudgeTrackIndex !== -1 ? layout.scoreXY(smudge.hole, smudgeTrackIndex) : null;
  const game = layout.gameHoleXY();

  return (
    <div className={styles.wrapper}>
      <div ref={frameRef} className={styles.svgFrame} style={{ aspectRatio: `${vbW} / ${vbH}` }}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        >
          {layout.lanePaths.map((d, trackIndex) => (
            <path
              key={`lane-${trackIndex}`}
              d={d}
              className={styles.lane}
              style={{ stroke: trackColorVar(tracks[trackIndex].track.color), strokeWidth: layout.laneWidth - 1 }}
            />
          ))}
          {layout.holes.map((lane, trackIndex) => (
            <g key={trackIndex}>
              {lane.map((hole, i) => (
                <circle key={i} cx={hole.x} cy={hole.y} r={layout.holeRadius} className={styles.hole} />
              ))}
              <circle
                cx={layout.startXY(trackIndex).x}
                cy={layout.startXY(trackIndex).y}
                r={layout.holeRadius}
                className={styles.startHole}
              />
            </g>
          ))}
          <circle cx={game.x} cy={game.y} r={layout.gameHoleRadius} className={styles.gameHole} />
          {layout.skunkTicks.map((tick) => (
            <line
              key={tick.after}
              x1={tick.from.x}
              y1={tick.from.y}
              x2={tick.to.x}
              y2={tick.to.y}
              className={styles.skunkLine}
            />
          ))}
        </svg>

        <div className={styles.overlay} aria-hidden="true">
          {layout.marks.map((mark) => (
            <span
              key={mark.value}
              className={styles.mark}
              style={{ left: pct(mark.x, vbW), top: pct(mark.y, vbH) }}
            >
              {mark.value}
            </span>
          ))}
          <span
            className={`${styles.mark} ${styles.gameMark}`}
            style={{ left: pct(layout.gameMark.x, vbW), top: pct(layout.gameMark.y, vbH) }}
          >
            121
          </span>
          {layout.skunkTicks.map((tick) => (
            <span
              key={`skunk-${tick.after}`}
              className={styles.skunkLabel}
              style={{ left: pct(tick.label.x, vbW), top: pct(tick.label.y, vbH) }}
            >
              Skunk
            </span>
          ))}
          {tracks.map((trackState, trackIndex) => (
            <span
              key={`label-${trackState.track.id}`}
              className={styles.laneLabel}
              style={{ left: pct(layout.laneLabels[trackIndex].x, vbW), top: pct(layout.laneLabels[trackIndex].y, vbH) }}
            >
              {trackState.track.shortLabel}
            </span>
          ))}

          {tracks.map((trackState, trackIndex) => (
            <OverlayPeg
              key={trackState.track.id}
              trackState={trackState}
              trackIndex={trackIndex}
              layout={layout}
              color={trackColorVar(trackState.track.color)}
              reduceMotion={reduceMotion}
              scale={scale}
            />
          ))}

          {smudge && smudgeXY ? (
            <div
              key={smudge.key}
              className={styles.smudge}
              style={{ left: pct(smudgeXY.x, vbW), top: pct(smudgeXY.y, vbH) }}
            />
          ) : null}
        </div>
      </div>
      <VisuallyHidden as="p">
        Peg board: {tracks.map((t) => `${t.track.label} ${t.score}, ${t.toGo} to go`).join('. ')}.
      </VisuallyHidden>
    </div>
  );
}

export default PegBoard;
