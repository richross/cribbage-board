// The peg-board visualization: four 30-hole "streets" plus a single 121
// game hole, one lane per track. Holes and the skunk lines are drawn as
// native SVG (they scale cleanly with the viewBox); pegs and every text
// label are rendered as a plain HTML overlay on top so their real on-screen
// size never shrinks with the SVG's viewBox scale — this is what keeps the
// board legible ("the hero") at arm's length on a phone. The SVG itself is
// aria-hidden — the scoring rows are the real input/output, and a
// VisuallyHidden summary carries the same information as text.
import { useEffect, useRef, useState } from 'react';
import type { TrackState } from '../../domain/board';
import PegShape from '../../components/PegShape/PegShape';
import VisuallyHidden from '../../components/VisuallyHidden/VisuallyHidden';
import { trackColorVar } from './colors';
import { buildLayout, STREET_COUNT, HOLES_PER_STREET, GAME_HOLE } from './pegBoardLayout';
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

function OverlayPeg({
  trackState,
  trackIndex,
  layout,
  color,
  reduceMotion,
}: {
  trackState: TrackState;
  trackIndex: number;
  layout: PegBoardLayout;
  color: string;
  reduceMotion: boolean;
}) {
  const displayScore = useAnimatedScore(trackState.score, reduceMotion);
  const front = layout.scoreXY(displayScore, trackIndex);
  const back = layout.scoreXY(trackState.backPeg, trackIndex);

  return (
    <>
      {trackState.score > 0 ? (
        <div
          className={styles.peg}
          style={{ left: pct(back.x, layout.vbW), top: pct(back.y, layout.vbH) }}
        >
          <PegShape shape={trackState.track.shape} color={color} solid={false} size={16} />
        </div>
      ) : null}
      <div className={styles.peg} style={{ left: pct(front.x, layout.vbW), top: pct(front.y, layout.vbH) }}>
        <PegShape
          shape={trackState.track.shape}
          color={color}
          solid
          size={18}
          title={`${trackState.track.label} peg`}
        />
      </div>
    </>
  );
}

function PegBoard({ tracks, smudge }: PegBoardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const layout = buildLayout(tracks.length);
  const { vbW, vbH } = layout;
  const lastStreet = STREET_COUNT - 1;

  const smudgeTrackIndex = smudge ? tracks.findIndex((t) => t.track.id === smudge.trackId) : -1;
  const smudgeXY = smudge && smudgeTrackIndex !== -1 ? layout.scoreXY(smudge.hole, smudgeTrackIndex) : null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.svgFrame} style={{ aspectRatio: `${vbW} / ${vbH}` }}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        >
          {Array.from({ length: STREET_COUNT }).map((_, street) => (
            <g key={street}>
              {tracks.map((trackState, trackIndex) => {
                const y = layout.laneY(street, trackIndex);
                return (
                  <g key={trackState.track.id}>
                    {Array.from({ length: HOLES_PER_STREET }).map((__, holeIndex) => (
                      <circle key={holeIndex} cx={layout.holeX(holeIndex)} cy={y} r={3.4} className={styles.hole} />
                    ))}
                    {street === lastStreet ? (
                      <circle
                        cx={layout.gameHoleXY(trackIndex).x}
                        cy={layout.gameHoleXY(trackIndex).y}
                        r={6.4}
                        className={styles.gameHole}
                      />
                    ) : null}
                  </g>
                );
              })}
            </g>
          ))}

          {/* Skunk lines: dashed, after hole 60 (top of street index 2) and after hole 90 (top of street index 3). */}
          {[2, 3].map((street) => {
            const y = layout.bandTop(street) - layout.geometry.streetGap / 2;
            return <line key={`skunk-${street}`} x1={0} x2={vbW} y1={y} y2={y} className={styles.skunkLine} />;
          })}
        </svg>

        {/* HTML overlay: pegs and every text label live here so their real CSS
            pixel size is independent of the SVG viewBox scale. */}
        <div className={styles.overlay} aria-hidden="true">
          {tracks.map((trackState, trackIndex) =>
            Array.from({ length: STREET_COUNT }).map((_, street) => (
              <span
                key={`${trackState.track.id}-${street}`}
                className={styles.laneLabel}
                style={{ left: pct(4, vbW), top: pct(layout.laneY(street, trackIndex), vbH) }}
              >
                {trackState.track.shortLabel}
              </span>
            )),
          )}

          {[0, 1, 2].map((street) => (
            <span
              key={`mark-${street}`}
              className={styles.mark}
              style={{
                left: pct(layout.geometry.leftMargin + layout.streetWidth + 3, vbW),
                top: pct(layout.bandTop(street) + layout.bandHeight / 2, vbH),
              }}
            >
              {(street + 1) * HOLES_PER_STREET}
            </span>
          ))}
          <span
            className={styles.mark}
            style={{
              left: pct(layout.gameHoleXY(0).x, vbW),
              top: pct(layout.bandTop(lastStreet) - 5, vbH),
              transform: 'translateX(-50%)',
            }}
          >
            {GAME_HOLE}
          </span>

          {[2, 3].map((street) => {
            const y = layout.bandTop(street) - layout.geometry.streetGap / 2;
            return (
              <span
                key={`skunk-label-${street}`}
                className={styles.skunkLabel}
                style={{ top: pct(y, vbH), transform: 'translateY(-100%)' }}
              >
                Skunk
              </span>
            );
          })}

          {tracks.map((trackState, trackIndex) => (
            <OverlayPeg
              key={trackState.track.id}
              trackState={trackState}
              trackIndex={trackIndex}
              layout={layout}
              color={trackColorVar(trackState.track.color)}
              reduceMotion={reduceMotion}
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
