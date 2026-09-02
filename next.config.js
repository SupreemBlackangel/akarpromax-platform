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

  async headers() {
    return [
      {
        // The office desktop app's update check.
        //
        // bootstrap.js runs inside WebView2 on the https://akarapp.local virtual
        // host and fetches this manifest from akarpromax.com, which is
        // cross-origin. The path served no Access-Control-Allow-Origin, so the
        // fetch failed on CORS -- reproduced in a browser and confirmed against
        // production -- and no installation has ever been told an update exists.
        //
        // These files are public by nature: a version number, a download URL and
        // release notes, served to an app that has not signed in yet. There is
        // nothing here to protect with an origin restriction, and the desktop
        // host is not a fixed origin we could name anyway.
        source: "/office-app/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          // Never cached: an update check that reads a stale manifest is the
          // same as no update check.
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        // The installer itself, for the same reason: the app follows the URL
        // this manifest gives it.
        source: "/downloads/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};
export default nextConfig;
