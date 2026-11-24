import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="login-wrap">
      <div className="card login-card stack">
        <h1>Sahifa topilmadi</h1>
        <p className="muted">Siz izlayotgan sahifa mavjud emas yoki ko‘chirilgan.</p>
        <Link href="/" className="btn btn-primary">
          Bosh sahifaga qaytish
        </Link>
      </div>
    </main>
  );
}
