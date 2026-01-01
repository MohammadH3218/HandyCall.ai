/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@handycall/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
