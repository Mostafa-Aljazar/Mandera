/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
