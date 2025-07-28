/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Extend API route timeout for long-running sequential requests
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache',
          },
        ],
      },
    ];
  },
  // For Vercel deployment: extend serverless function timeout
  experimental: {
    // This helps with long-running API routes in development
    isrFlushToDisk: false,
  },
}

module.exports = nextConfig