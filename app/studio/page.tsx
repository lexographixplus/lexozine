import { AuthView } from "@neondatabase/auth-ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import StudioWorkspace from "@/components/studio-workspace";
import { auth, authConfigured } from "@/lib/auth/server";
import "../auth/auth.css";
import "./composer.css";

export const dynamic = "force-dynamic";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ legacy?: string; issue?: string }> }) {
  if (!authConfigured) redirect("/auth/setup-required");

  const query = await searchParams;
  const { data: session } = await auth.getSession();

  if (session?.user) {
    if (query.legacy === "1") {
      return (
        <main className="studio-authenticated-shell">
          <StudioWorkspace />
          <div className="studio-authenticated-badge">Legacy full-spread studio · authenticated</div>
        </main>
      );
    }
    redirect("/issues");
  }

  return (
    <main className="lexostudio-auth-shell">
      <section className="lexostudio-auth-story">
        <div className="lexostudio-auth-brand">
          <div className="lexostudio-auth-mark">LS</div>
          <div className="lexostudio-auth-brand-copy">
            <strong>LexoStudio</strong>
            <span>by LexoGraphix Plus</span>
          </div>
        </div>

        <div className="lexostudio-auth-message">
          <span className="lexostudio-auth-kicker">Editorial workspace</span>
          <h1>Create publications worth reading.</h1>
          <p>
            Organise issues, edit articles, shape layouts, review and publish magazine editions from one focused workspace.
          </p>
        </div>

        <div className="lexostudio-auth-footer">
          <span>LEXOZINE · DIGITAL PUBLISHING STUDIO</span>
          <strong>CREATE · PUBLISH · DIGITIZE · GROW</strong>
        </div>
      </section>

      <section className="lexostudio-auth-panel">
        <div className="lexostudio-auth-panel-inner">
          <div className="lexostudio-auth-panel-header">
            <span>Private access</span>
            <h2>Welcome back.</h2>
            <p>Sign in to continue to the LexoStudio editorial publishing workspace.</p>
          </div>
          <div className="lexostudio-auth-card">
            <AuthView path="sign-in" />
          </div>
          <Link href="/" className="lexostudio-auth-back">← Return to the public library</Link>
        </div>
      </section>
    </main>
  );
}
