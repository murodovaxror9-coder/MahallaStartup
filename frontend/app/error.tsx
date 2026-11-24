'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Xatolik yuz berdi</h1>
        <p className="muted">Sahifani yuklab bo&apos;lmadi. Qayta urinib ko&apos;ring.</p>
        <p>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Qayta urinish
          </button>
        </p>
      </div>
    </div>
  );
}
