import type { CSSProperties, ElementType, ReactNode } from 'react';

const style: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** Renders content for screen readers only, visually hidden but reachable by keyboard/focus. */
function VisuallyHidden({ children, as: As = 'span' }: { children: ReactNode; as?: ElementType }) {
  return <As style={style}>{children}</As>;
}

export default VisuallyHidden;
