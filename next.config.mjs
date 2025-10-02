/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      // si usas signed-urls con dominio del proyecto, también valen:
      {
        protocol: 'https',
        hostname: '**.supabasein.com',
        pathname: '/storage/v1/object/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 768, 1024, 1280],
    imageSizes: [64, 96, 128, 256, 384],
  },
};

export default nextConfig;
