import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import styles from './SegmentedControl.module.css';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  /**
   * "stacked" centers a custom rendered option (see `renderOption`) in a
   * column, e.g. a symbol above a name, so options can stay equal-width
   * without truncating on narrow screens. Defaults to "default" (a single
   * row of wrapping text), which is unchanged for existing callers.
   */
  layout?: 'default' | 'stacked';
  /** Custom content per option; falls back to `option.label` text when omitted. */
  renderOption?: (option: SegmentedControlOption<T>, checked: boolean) => ReactNode;
}

/**
 * A `radiogroup` of mutually exclusive options (e.g. Hand / Crib) with
 * roving-tabindex arrow-key navigation, per WAI-ARIA radiogroup pattern.
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  layout = 'default',
  renderOption,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusIndex = (index: number) => {
    const wrapped = (index + options.length) % options.length;
    refs.current[wrapped]?.focus();
    onChange(options[wrapped].value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusIndex(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusIndex(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusIndex(0);
        break;
      case 'End':
        event.preventDefault();
        focusIndex(options.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className={[styles.group, className].filter(Boolean).join(' ')} role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={[styles.option, layout === 'stacked' ? styles.stacked : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {renderOption ? renderOption(option, checked) : option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
