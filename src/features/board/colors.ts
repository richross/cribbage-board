// Maps a domain TrackColor to its CSS custom property, since the domain
// model intentionally knows nothing about presentation.
import type { TrackColor } from '../../domain/board';

export function trackColorVar(color: TrackColor): string {
  return `var(--pencil-${color})`;
}
