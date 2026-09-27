import { useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import BoardPage from '../features/board/BoardPage';
import HandPage from '../features/hand/HandPage';
import RulesPage from '../features/rules/RulesPage';
import NotFoundPage from './NotFoundPage';
import UpdatePrompt from './UpdatePrompt';
import { LiveRegionProvider } from '../components';
import { BoardIcon, HandIcon, RulesIcon } from './icons';
import styles from './App.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Board', Icon: BoardIcon, end: true },
  { to: '/hand', label: 'Score Hand', Icon: HandIcon, end: false },
  { to: '/rules', label: 'Rules', Icon: RulesIcon, end: false },
] as const;

/**
 * Scrolls to the top and moves focus to the page heading on every route
 * change, so screen reader and keyboard users land on the new page's
 * content instead of retaining focus on the nav link they just activated.
 */
function useRouteChangeFocus(mainRef: React.RefObject<HTMLElement>) {
  const location = useLocation();

  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      // jsdom (unit tests) does not implement scrollTo; ignore there.
    }
    const heading = mainRef.current?.querySelector('h1');
    if (heading instanceof HTMLElement) {
      const hadTabIndex = heading.hasAttribute('tabindex');
      if (!hadTabIndex) {
        heading.setAttribute('tabindex', '-1');
      }
      heading.focus();
      if (!hadTabIndex) {
        const cleanup = () => heading.removeAttribute('tabindex');
        heading.addEventListener('blur', cleanup, { once: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}

function Shell() {
  const mainRef = useRef<HTMLElement>(null);
  useRouteChangeFocus(mainRef);

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <nav className={styles.nav} aria-label="Primary">
        <span className={styles.wordmark} aria-hidden="true">
          Cribbage Companion
        </span>
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => [styles.navItem, isActive ? styles.navItemActive : ''].filter(Boolean).join(' ')}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <main id="main-content" className={styles.main} ref={mainRef}>
        <Routes>
          <Route path="/" element={<BoardPage />} />
          <Route path="/hand" element={<HandPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/rules/:sectionId" element={<RulesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <UpdatePrompt />
    </div>
  );
}

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LiveRegionProvider>
        <Shell />
      </LiveRegionProvider>
    </HashRouter>
  );
}

export default App;
