import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'test.holidaibutler.com',
      },
      {
        protocol: 'https',
        hostname: 'api.holidaibutler.com',
      },
    ],
  },
};

export default nextConfig;
