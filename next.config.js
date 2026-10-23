/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Hide the floating Next.js dev-tools badge in `next dev` (it has no effect on production builds).
  devIndicators: false,
};

module.exports = nextConfig;
