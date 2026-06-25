import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // Apply security headers to all routes
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(self), geolocation=(self), payment=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Scripts: self + inline (Next.js requires it) + eval for dev
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            // Styles: self + inline (Tailwind/styled-jsx) + Leaflet CSS
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
            // Fonts
            "font-src 'self' https://fonts.gstatic.com data:",
            // Images: self + Supabase storage + map tiles + Leaflet icons + data URIs
            "img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.basemaps.cartocdn.com https://cdnjs.cloudflare.com https://unpkg.com",
            // Connect: self + Supabase (REST, Realtime WS, Auth) + map tiles
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com",
            // Workers for service worker
            "worker-src 'self' blob:",
            // Frame: deny embedding
            "frame-ancestors 'none'",
            // Form actions
            "form-action 'self'",
            // Base URI
            "base-uri 'self'",
            // Manifest
            "manifest-src 'self'",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
