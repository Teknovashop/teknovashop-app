/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Evita la optimización de Next en Vercel para imágenes locales (public/*)
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
