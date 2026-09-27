import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../lib/useDocumentTitle';

function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <section>
      <h1>Page not found</h1>
      <p>
        That page doesn&rsquo;t exist. <Link to="/">Back to Board</Link>
      </p>
    </section>
  );
}

export default NotFoundPage;
