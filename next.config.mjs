/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker/serverless deployment
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // Suppress build-time errors from dynamic env vars (checked at runtime)
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs'],
  },
};

export default nextConfig;
