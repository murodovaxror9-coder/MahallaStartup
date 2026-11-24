'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="login-wrap">
      <div className="card login-card stack">
        <h1>Xatolik yuz berdi</h1>
        <p className="muted">Sahifani yuklab bo‘lmadi. Qayta urinib ko‘ring.</p>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Qayta urinish
        </button>
      </div>
    </main>
  );
}
