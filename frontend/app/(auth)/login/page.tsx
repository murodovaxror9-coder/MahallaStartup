import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Kirish' };

export default function LoginPage() {
  return (
    <div className="auth-card">
      <h1>Mahalladosh</h1>
      <p className="muted">Mahalla admini sifatida tizimga kiring</p>
      <LoginForm />
    </div>
  );
}
