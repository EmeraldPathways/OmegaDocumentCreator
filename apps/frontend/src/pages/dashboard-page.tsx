import { Link } from "react-router-dom";

export function DashboardPage() {
  return (
    <div className="dashboard-grid">
      <section className="panel hero-panel">
        <p className="eyebrow">Omega Financial Management</p>
        <h1>Internal document workflows</h1>
        <p>
          Version 1 is centered on Income Protection, with Pensions and Investments staged for
          later releases once the shared client, document, and file workflows are complete.
        </p>
        <div className="dashboard-module-strip" aria-label="Module roadmap">
          <Link
            aria-label="Open Income Protection module"
            className="dashboard-module-card is-primary"
            to="/clients"
          >
            <span className="dashboard-module-version">V1</span>
            <strong>Income Protection</strong>
            <span>Open client records and start workflow preparation.</span>
            <span className="dashboard-module-link">Open Income Protection module</span>
          </Link>

          <article className="dashboard-module-card">
            <span className="dashboard-module-version">V2</span>
            <strong>Pensions</strong>
            <span>Reserved for pension review, suitability, and recommendation workflows.</span>
          </article>

          <article className="dashboard-module-card">
            <span className="dashboard-module-version">V3</span>
            <strong>Investments</strong>
            <span>Reserved for investment planning, fact find, and document generation.</span>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2>Stage 15 focus</h2>
        <ul>
          <li>Keep the homepage focused on clear module entry points</li>
          <li>Show current versus future releases without exposing unfinished routes</li>
          <li>Preserve the office-first Omega burgundy, grey, and white visual language</li>
        </ul>
      </section>
    </div>
  );
}
