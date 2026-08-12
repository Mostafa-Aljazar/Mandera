/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Property creation posts the image files themselves through a Server
    // Action (see uploadPropertyImages in src/actions/properties.ts), and the
    // 1 MB default rejects a single phone photo with a bare 413 ("Body
    // exceeded 1 MB limit") that surfaces as Next's generic production error.
    //
    // 4 MB is the ceiling worth setting, not an arbitrary one: Vercel caps a
    // serverless function's request body at 4.5 MB, so a larger value here
    // would be overruled by the platform and fail the same way. Twelve
    // full-size photos still exceed it — the real fix is shrinking images in
    // the browser before upload (PropertyFinder downscales everything to
    // 1920x1080 anyway) or uploading straight to storage via a signed URL.
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  async rewrites() {
    // In production, Hostinger's infrastructure proxies /hcgi/platform to the
    // PocketBase backend directly (same convention the Vite app relied on) —
    // this app-level rewrite is a local-dev-only convenience so `next dev`
    // can reach a local PocketBase instance without that proxy in front of it.
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          source: '/hcgi/platform/:path*',
          destination: 'http://127.0.0.1:8090/:path*',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
