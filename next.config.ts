import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/channel/:slug',
        destination: '/@:slug',
        permanent: true, // 301 redirect for SEO
      },
    ]
  },
};

export default nextConfig;