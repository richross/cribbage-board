import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import RulesLayout from './components/RulesLayout';
import SearchPanel from './components/SearchPanel';
import { rulesSections } from './lib/sections';
import styles from './RulesIndexPage.module.css';

/**
 * `#/rules` — the rules index: a sticky search field, then every section
 * (in `order`) as a plain row (title + summary), not cards.
 */
function RulesIndexPage() {
  useDocumentTitle('Rules');

  return (
    <RulesLayout>
      <h1>Rules</h1>
      <p className={styles.intro}>
        Original cribbage rules, written for the table — search for a term or browse every section below.
      </p>
      <div className={styles.searchSticky}>
        <SearchPanel />
      </div>
      <ul className={styles.list}>
        {rulesSections.map((section) => (
          <li key={section.id}>
            <Link to={`/rules/${section.id}`} className={styles.row}>
              <span className={styles.title}>{section.title}</span>
              <span className={styles.summary}>{section.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </RulesLayout>
  );
}

export default RulesIndexPage;
