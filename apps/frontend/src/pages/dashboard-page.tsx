import { Link } from "react-router-dom";

export function DashboardPage() {
  return (
    <div className="page-stack">
      <section className="section-divided hero-section">
        <span className="section-kicker">Omega Financial Management</span>
        <h1>Internal document workflows</h1>
        <p>
          Version 1 is centered on Income Protection, with Pensions and Investments staged for
          later releases once the shared client, document, and file workflows are complete.
        </p>
        <div className="module-grid" aria-label="Module roadmap">
          <Link
            aria-label="Open Income Protection module"
            className="module-card module-card-primary"
            to="/clients"
          >
            <span className="module-card-version">V1</span>
            <strong>Income Protection</strong>
            <span>Open client records and start workflow preparation.</span>
            <span className="module-card-link">Open Income Protection module</span>
          </Link>

          <article className="module-card">
            <span className="module-card-version">V2</span>
            <strong>Pensions</strong>
            <span>Reserved for pension review, suitability, and recommendation workflows.</span>
          </article>

          <article className="module-card">
            <span className="module-card-version">V3</span>
            <strong>Investments</strong>
            <span>Reserved for investment planning, fact find, and document generation.</span>
          </article>
        </div>
      </section>

      <section className="section">
        <h2>Stage 15 focus</h2>
        <ul className="clean-list" style={{ marginTop: "var(--space-4)" }}>
          <li>Keep the homepage focused on clear module entry points</li>
          <li>Show current versus future releases without exposing unfinished routes</li>
          <li>Preserve the office-first Omega burgundy, grey, and white visual language</li>
        </ul>
      </section>
    </div>
  );
}