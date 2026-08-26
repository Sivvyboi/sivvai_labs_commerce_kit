import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ---------------------------------------------------------------------------
  // Development: allow access from local network (e.g. 192.168.x.x)
  // Suppresses the "allowedDevOrigins" warning when testing on a phone/tablet.
  // ---------------------------------------------------------------------------
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.18.2",
    "192.168.18.3",
    "192.168.18.4"

  ],

  // ---------------------------------------------------------------------------
  // Images
  // Allowlist domains for next/image. Add your CDN / Supabase storage bucket
  // hostname here. Example: images.supabase.co
  // ---------------------------------------------------------------------------
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Logging (development only)
  // Surfaces every fetch() call in the terminal so slow/uncached requests
  // are immediately visible during development.
  // ---------------------------------------------------------------------------
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: false,
    },
  },

  // ---------------------------------------------------------------------------
  // HTTP Security Headers
  // Applied to every response. Tighten per-route via middleware if needed.
  // ---------------------------------------------------------------------------
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Force HTTPS (1 year, include subdomains)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Limit referrer information sent to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Basic permissions policy — tighten once features are known
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
