import path from "node:path";
import { fileURLToPath } from "node:url";

// The ONLY Next config — keep it that way. Next loads the first of
// next.config.js / .mjs / .ts it finds, and a second file silently shadows
// this one: a next.config.js added later (holding just turbopack.root) left
// every setting below — redirects, serverExternalPackages, image CSP —
// ignored in production.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optional OTP providers (dynamic import in lib/otpProvider.js) — not always
  // installed. Kept out of the server bundles, which also keeps cold starts
  // lighter (aws-sdk v2 is very large).
  serverExternalPackages: ["twilio", "aws-sdk"],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  turbopack: {
    // Pin the workspace root — otherwise Turbopack can infer a parent
    // directory (e.g. from a git worktree's lockfile under .claude/).
    root: projectRoot,
  },
  async redirects() {
    return [
      { source: "/login", destination: "/auth/login", permanent: false },
      { source: "/signup", destination: "/auth/signup", permanent: false },
      { source: "/register", destination: "/auth/register", permanent: false },
      { source: "/otp", destination: "/auth/otp", permanent: false },
      { source: "/reset-password", destination: "/auth/reset-password", permanent: false },
    ];
  },
};

export default nextConfig;
