export function AuthCard({ title, description, children, footer }) {
  return (
    <div className="auth-screen">
      <div className="ambient-backdrop" aria-hidden="true" />
      <section className="auth-card">
        <div className="auth-card__eyebrow">instan / react</div>
        <h1 className="auth-card__title">{title}</h1>
        <p className="auth-card__description">{description}</p>
        {children}
        {footer ? <div className="auth-card__footer">{footer}</div> : null}
      </section>
    </div>
  );
}
