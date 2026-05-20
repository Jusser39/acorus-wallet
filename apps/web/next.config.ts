import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@acorus/shared", "@acorus/wallet-core"],
  async headers() {
    const scriptSrc = isDevelopment
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
    const connectSrc = isDevelopment
      ? "connect-src 'self' http://127.0.0.1:* http://localhost:* https: ws: wss:"
      : "connect-src 'self' https: wss:";

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
          scriptSrc,
          connectSrc,
          "manifest-src 'self'",
          "worker-src 'self' blob:",
          "form-action 'self'",
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
