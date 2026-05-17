import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@acorus/shared", "@acorus/wallet-core"],
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline'",
          "connect-src 'self' https: wss:",
          "manifest-src 'self'",
          "worker-src 'self' blob:",
          "form-action 'self'",
          "upgrade-insecure-requests",
        ].join("; "),
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Permissions-Policy",
        value: [
          "camera=()",
          "microphone=()",
          "geolocation=()",
          "payment=()",
          "usb=()",
          "publickey-credentials-get=(self)",
        ].join(", "),
      },
    ];

    const noStoreHeaders = [
      {
        key: "Cache-Control",
        value: "no-store, max-age=0",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/(create|import|unlock|wallet|send|receive|swap|security|settings)",
        headers: noStoreHeaders,
      },
      {
        source: "/tokens/:path*",
        headers: noStoreHeaders,
      },
    ];
  },
};

export default nextConfig;
