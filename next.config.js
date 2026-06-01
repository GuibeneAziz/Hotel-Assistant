/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Tree-shake only the icons/components actually imported — cuts bundle size
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
  },
}

module.exports = nextConfig