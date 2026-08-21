import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { resolveCoverImageUrl } from "@/lib/magazine-design";
import { listIssues } from "@/lib/server/issue-repository";
import "./public-home.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LexoStudio · Digital Magazines",
  description: "Discover digital magazine editions created and published through LexoStudio by LexoGraphix Plus.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ issue?: string }> }) {
  const query = await searchParams;

  // Compatibility for existing internal links that previously opened the editor at /?issue=...
  if (query.issue) {
    const { data: session } = await auth.getSession();
    if (session?.user) redirect(`/studio?issue=${encodeURIComponent(query.issue)}`);
  }

  const issues = await listIssues();
  const published = issues.filter((issue) =>
    issue.status === "published" &&
    issue.visibility === "public" &&
    Boolean(issue.publicSlug)
  );

  return (
    <main className="public-library-shell">
      <nav className="public-library-nav">
        <Link href="/" className="public-library-brand">
          <div className="public-library-mark">LS</div>
          <div className="public-library-brand-copy">
            <strong>LexoStudio</strong>
            <span>Digital publishing by LexoGraphix Plus</span>
          </div>
        </Link>
        <a href="https://www.lexographixplus.com/start" className="public-library-studio-link">Get Started</a>
      </nav>

      <section className="public-library-hero">
        <div>
          <span className="public-library-eyebrow">Independent digital publishing</span>
          <h1>Magazines made to be read.</h1>
        </div>
        <div className="public-library-hero-copy">
          <p>
            Explore editorial editions published through LexoStudio — a focused digital publishing workspace for stories, culture, ideas and visual narratives.
          </p>
          <strong>CREATE · PUBLISH · DIGITIZE · GROW</strong>
        </div>
      </section>

      <section className="public-library-section">
        <div className="public-library-section-head">
          <h2>Published editions</h2>
          <span>{published.length ? `${published.length} edition${published.length === 1 ? "" : "s"}` : "Library opening soon"}</span>
        </div>

        {published.length ? (
          <div className="public-issue-grid">
            {published.map((issue) => {
              const cover = resolveCoverImageUrl(issue);
              return (
                <Link href={`/${encodeURIComponent(issue.publicSlug!)}`} className="public-issue-card" key={issue.id}>
                  <div className="public-issue-cover">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={`${issue.title} cover`} />
                    ) : (
                      <div className="public-issue-fallback">
                        <small>Issue {issue.number} · {issue.editionDate}</small>
                        <strong>{issue.title}</strong>
                      </div>
                    )}
                  </div>
                  <div className="public-issue-card-copy">
                    <div className="public-issue-meta"><span>Issue {issue.number}</span><span>{issue.editionDate}</span></div>
                    <h3>{issue.title}</h3>
                    <p>{issue.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="public-library-empty">
            <div>
              <h3>The first shelf is being prepared.</h3>
              <p>Published public editions will appear here automatically when they go live from LexoStudio.</p>
            </div>
          </div>
        )}
      </section>

      <footer className="public-library-footer">
        <span>LexoStudio.gm · A LexoGraphix Plus publishing platform</span>
        <strong>Editorial design · Digital reading · Publishing systems</strong>
      </footer>
    </main>
  );
}
