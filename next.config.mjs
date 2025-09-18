/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // No pre-renderices rutas /api del backend externo
  // y evita que Next intente "exportarlas" en build.
  output: 'standalone',
};
