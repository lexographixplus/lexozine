export default function SetupRequiredPage() {
  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <span>LEXOZINE</span>
        <strong>Production setup required</strong>
        <p>The Studio is deployed, but team authentication has not been activated for this environment yet.</p>
      </section>
      <section className="auth-card setup-required-card">
        <span className="eyebrow">Secure by default</span>
        <h1>Finish environment configuration</h1>
        <p>Lexozine will remain locked until its Neon database, Neon Auth cookie secret, and Cloudinary credentials are configured on this Vercel project.</p>
        <div className="setup-required-list">
          <span>DATABASE_URL</span>
          <span>NEON_AUTH_COOKIE_SECRET</span>
          <span>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</span>
          <span>NEXT_PUBLIC_CLOUDINARY_API_KEY</span>
          <span>CLOUDINARY_API_SECRET</span>
        </div>
      </section>
    </main>
  );
}
