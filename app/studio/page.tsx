import { AuthView } from "@neondatabase/auth-ui";
import Link from "next/link";
import StudioWorkspace from "@/components/studio-workspace";
import { auth } from "@/lib/auth/server";
import "../auth/auth.css";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const { data: session } = await auth.getSession();

  if (session?.user) {
    return (
      <main className="studio-authenticated-shell">
        <StudioWorkspace />
        <div className="studio-authenticated-badge">Private studio · authenticated</div>
      </main>
    );
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
            Design, structure, review and publish magazine editions from one focused editorial workspace.
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
            <p>Sign in to continue to the LexoStudio publishing workspace.</p>
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
