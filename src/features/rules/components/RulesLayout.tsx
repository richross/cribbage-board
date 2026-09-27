import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { rulesSections } from '../lib/sections';
import styles from './RulesLayout.module.css';

export interface RulesLayoutProps {
  children: ReactNode;
}

/**
 * Shared two-column shell for both Rules routes: on mobile it's a single
 * reading column; at >=900px a left margin index (tabs down the side, one
 * per section in `order`) sits beside the reading column, per direction.md.
 */
function RulesLayout({ children }: RulesLayoutProps) {
  return (
    <div className={styles.layout}>
      <nav className={styles.marginIndex} aria-label="Rules sections">
        <NavLink to="/rules" end className={({ isActive }) => [styles.marginLink, isActive ? styles.marginLinkActive : ''].filter(Boolean).join(' ')}>
          All rules
        </NavLink>
        <ul className={styles.marginList}>
          {rulesSections.map((section) => (
            <li key={section.id}>
              <NavLink
                to={`/rules/${section.id}`}
                className={({ isActive }) => [styles.marginLink, isActive ? styles.marginLinkActive : ''].filter(Boolean).join(' ')}
              >
                {section.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.reading}>
        <div className="sheet--plain">{children}</div>
      </div>
    </div>
  );
}

export default RulesLayout;
