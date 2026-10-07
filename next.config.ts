import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/artikel/panduan-membuat-clip-video-youtube-yang-jelas",
        destination: "/artikel/clip-video-youtube-yang-jelas",
        permanent: true
      },
      {
        source: "/artikel/hak-cipta-dan-izin-membuat-clip-video",
        destination: "/artikel/hak-cipta-clip-video",
        permanent: true
      },
      {
        source: "/artikel/cara-menyiapkan-video-untuk-clip-pendek",
        destination: "/artikel/video-untuk-clip-pendek",
        permanent: true
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
