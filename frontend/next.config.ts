import type { NextConfig } from 'next';

// Brauzer faqat admin origin'iga murojaat qiladi; /api/* shu yerdan API'ga proksi qilinadi.
// Natija: bitta origin -> CORS yo'q, cookie (mhd_session) va CSRF oddiy ishlaydi.
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
