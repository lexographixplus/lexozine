import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import Link from "next/link";
import "../auth.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
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
          <span className="lexostudio-auth-kicker">Secure publishing access</span>
          <h1>Your editorial work stays behind the studio door.</h1>
          <p>Complete the secure account step below, then return to the private publishing workspace.</p>
        </div>
        <div className="lexostudio-auth-footer">
          <span>LEXOZINE · DIGITAL PUBLISHING STUDIO</span>
          <strong>CREATE · PUBLISH · DIGITIZE · GROW</strong>
        </div>
      </section>
      <section className="lexostudio-auth-panel">
        <div className="lexostudio-auth-panel-inner">
          <div className="lexostudio-auth-panel-header">
            <span>Account security</span>
            <h2>LexoStudio access.</h2>
            <p>Continue the requested authentication step securely.</p>
          </div>
          <div className="lexostudio-auth-card"><AuthView path={path} /></div>
          <Link href="/studio" className="lexostudio-auth-back">← Back to Studio sign in</Link>
        </div>
      </section>
    </main>
  );
}
