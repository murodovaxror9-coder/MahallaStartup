import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Sahifa topilmadi</h1>
        <p className="muted">Siz izlayotgan sahifa mavjud emas yoki ko&apos;chirilgan.</p>
        <p>
          <Link href="/" className="btn btn-primary">
            Bosh sahifaga qaytish
          </Link>
        </p>
      </div>
    </div>
  );
}
