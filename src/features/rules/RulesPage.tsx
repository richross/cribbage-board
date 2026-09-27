import { useParams } from 'react-router-dom';
import RulesIndexPage from './RulesIndexPage';
import RulesSectionPage from './RulesSectionPage';

/**
 * Routed at both `/rules` and `/rules/:sectionId` (see src/app/App.tsx,
 * which this feature does not own): dispatches to the index or a single
 * section based on the route param.
 */
function RulesPage() {
  const { sectionId } = useParams();
  return sectionId ? <RulesSectionPage /> : <RulesIndexPage />;
}

export default RulesPage;
