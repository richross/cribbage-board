import Button from '../Button/Button';
import styles from './ConfirmInline.module.css';

export interface ConfirmInlineProps {
  /** e.g. "Start a new game?" */
  prompt: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  className?: string;
}

/**
 * An inline confirm pattern — "Start a new game? [Cancel] [New game]" —
 * used instead of a modal for destructive or hard-to-undo actions. Renders
 * in place, next to the action that triggered it.
 */
function ConfirmInline({
  prompt,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = true,
  className,
}: ConfirmInlineProps) {
  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')} role="group" aria-label={prompt}>
      <p className={styles.prompt}>{prompt}</p>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={destructive ? 'destructive' : 'primary'} size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

export default ConfirmInline;
