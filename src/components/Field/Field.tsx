import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import styles from './Field.module.css';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * The pad-style underline input: label above in engineering caps, an
 * ink bottom rule, paper-raised fill. Used for search and the number pad
 * display.
 */
const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, id, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={styles.wrapper}>
      <label htmlFor={inputId} className={[styles.label, 'label'].join(' ')}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={[styles.input, error ? styles.error : '', className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...rest}
      />
      {error ? (
        <p id={errorId} className={styles.errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default Field;
