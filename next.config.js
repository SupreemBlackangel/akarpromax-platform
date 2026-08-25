/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Lets a verification build run while another server still holds `.next`,
  // which Windows locks. Defaults to the standard directory.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  serverExternalPackages: ['@napi-rs/canvas', 'tesseract.js', 'tesseract.js-core', 'wasm-feature-detect'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3010', 'akarpromax.com'],
    },
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'https', hostname: 'api.akarpromax.com' },
      { protocol: 'https', hostname: 'cdn.akarpromax.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  typescript: { ignoreBuildErrors: false },
};
export default nextConfig;
