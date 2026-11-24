import type { NextConfig } from 'next';

// API_URL berilsa /api/v1/* haqiqiy backendga proksi qilinadi (cookie bir origin'da qoladi).
// Berilmasa, src/app/api/v1/[...path] dagi mock server ishlaydi.
const apiUrl = process.env.API_URL?.replace(/\/$/, '');

const config: NextConfig = {
  async rewrites() {
    return apiUrl ? { beforeFiles: [{ source: '/api/v1/:path*', destination: `${apiUrl}/api/v1/:path*` }], afterFiles: [], fallback: [] } : [];
  },
};

export default config;
