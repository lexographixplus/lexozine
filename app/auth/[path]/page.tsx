import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  return (
    <main className="auth-shell">
      <div className="auth-brand">
        <span>LEXOZINE</span>
        <strong>Editorial Studio</strong>
        <p>Secure internal publishing workspace for LexoGraphix Plus.</p>
      </div>
      <div className="auth-card"><AuthView path={path} /></div>
    </main>
  );
}
