import { useParams } from 'react-router-dom';

function RulesPage() {
  const { sectionId } = useParams();

  return (
    <section>
      <h1>Rules</h1>
      <p>Placeholder for the cribbage rules reference.</p>
      {sectionId ? <p>Section: {sectionId}</p> : null}
    </section>
  );
}

export default RulesPage;
