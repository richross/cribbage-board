import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import styles from './Key.module.css';

export interface KeyProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Track color for the 2px top rule when this key is scoped to a track (e.g. a player's +1..+6 pad). */
  trackColor?: string;
  /** Visually indicates the key is currently held down (for programmatic/testing use beyond native :active). */
  pressed?: boolean;
}

/**
 * The pad key: +1..+6, the "#" number pad key, and rank keys share this
 * 48px-minimum, paper-raised, pressed-paper-tab vocabulary.
 */
const Key = forwardRef<HTMLButtonElement, KeyProps>(function Key(
  { trackColor, pressed, style, className, ...rest },
  ref,
) {
  const mergedStyle = trackColor ? { ...style, ['--track-color' as string]: trackColor } : style;

  return (
    <button
      ref={ref}
      type="button"
      className={[styles.key, className].filter(Boolean).join(' ')}
      style={mergedStyle}
      data-pressed={pressed ? 'true' : undefined}
      {...rest}
    />
  );
});

export default Key;
