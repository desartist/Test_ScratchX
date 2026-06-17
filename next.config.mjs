/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optional OTP providers (dynamic import in lib/otpProvider.js) — not always installed
  serverExternalPackages: ["twilio", "aws-sdk"],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  turbopack: {},
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
