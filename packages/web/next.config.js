/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export in production builds, not in dev mode
  // output: 'export', // Commented out for local development - middleware requires server mode
  transpilePackages: ['@handycall/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
