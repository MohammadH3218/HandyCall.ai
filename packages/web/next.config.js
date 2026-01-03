/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@handycall/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.handycall.org/api/v1',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://handycall.org',
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
