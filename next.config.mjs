/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel deployment (no standalone needed — Vercel handles it automatically)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // External packages that shouldn't be bundled into serverless functions
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs'],
  },
};

export default nextConfig;
