const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
      '@/components': path.join(__dirname, 'src/components'),
      '@/lib': path.join(__dirname, 'src/lib'),
      '@/types': path.join(__dirname, 'src/types'),
      '@/app': path.join(__dirname, 'src/app'),
    }

    return config
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DEBUG: process.env.DEBUG,
    LOG_LEVEL: process.env.LOG_LEVEL,
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS,
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
    MAX_REQUESTS_PER_HOUR: process.env.MAX_REQUESTS_PER_HOUR,
    MAX_REQUESTS_PER_DAY: process.env.MAX_REQUESTS_PER_DAY,
  },
  // Environment-specific optimizations
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error'],
      },
    },
  }),
  // Security headers for production
  async headers() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            },
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains',
            },
          ],
        },
      ];
    }
    return [];
  },
}

module.exports = nextConfig