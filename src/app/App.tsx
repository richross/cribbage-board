import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import BoardPage from '../features/board/BoardPage';
import HandPage from '../features/hand/HandPage';
import RulesPage from '../features/rules/RulesPage';

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app-shell">
        <nav aria-label="Primary">
          <NavLink to="/">Board</NavLink>
          <NavLink to="/hand">Score Hand</NavLink>
          <NavLink to="/rules">Rules</NavLink>
        </nav>
        <main>
          <Routes>
            <Route path="/" element={<BoardPage />} />
            <Route path="/hand" element={<HandPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/rules/:sectionId" element={<RulesPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
