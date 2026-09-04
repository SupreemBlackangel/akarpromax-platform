/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Lets a verification build run while another server still holds `.next`,
  // which Windows locks. Defaults to the standard directory.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Standalone traces the project directory, and this repository holds several
  // large things that have nothing to do with the web server. Measured before
  // this exclusion: 539 MB, of which 161 MB was the DevExpress component
  // library (a licensed desktop product), 86 MB the compiled desktop app
  // including its two local SQLite databases, and 45 MB a stale `dist`.
  //
  // None of it was ever reachable over HTTP -- verified against production,
  // every path answered 404 -- so this is not a disclosure fix. It is 300 MB
  // uploaded on every deploy, which is why deploys were taking over ten
  // minutes.
  // The worst of it was `.git`: 106 MB of full repository history, deployed to
  // the production host and readable there with `git log`. It was never served
  // over HTTP -- every path checked answered 404 -- and no .env was ever
  // committed, so this is not an active disclosure. But the entire source and
  // its history sitting on a public-facing server turns any file-read into a
  // total one, and a past credential exposure is already documented in
  // docs/security/. It has no business being there.
  outputFileTracingExcludes: {
    '*': [
      './.git/**',
      './.vs/**',
      './devexpress/**',
      './AkarApp_LIVE/**',
      './dist/**',
      './artifacts/**',
      './docs/**',
      './examples/**',
      './tests/**',
      './**/*.bundle',
    ],
    // NOT excluded, and both were on the first draft of this list:
    //   tessdata/          — lib/land/ocr/tessdata.ts resolves it from
    //                        process.cwd() at runtime, so OCR would start
    //                        failing on the server and nowhere else.
    //   drizzle-pg-forward/ — FORWARD_MIGRATIONS_FOLDER; the migrator reads
    //                        the .sql files from disk.
  },
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
      {
        // Ad serving and its tracking, for the office channel.
        //
        // Five `office_*` placements have been selectable and targetable in the
        // admin all along, and the desktop app could never receive one of them.
        // Its own DesktopAdService points at /api/desktop/ads/... -- a route
        // family that does not exist, confirmed 404 against production -- and
        // types its ad id as an int while campaign ids are UUIDs, so it was
        // written for an API that predates this platform.
        //
        // bootstrap.js runs on https://akarapp.local and is served from here,
        // so it can carry the office banner without reinstalling anything. It
        // needs these three paths cross-origin to do it.
        //
        // `*` is correct rather than lax: none of these routes reads a cookie
        // or a session. Match is public data. Impression and click authorise on
        // a signed, campaign-bound, single-use token in the BODY, which a
        // wildcard origin does nothing to hand out -- and both were already
        // reachable from any server-side client, where CORS never applied.
        source: "/api/ads/:path(match|impression|click)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};
export default nextConfig;
