import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // اجازه باز کردن سایت در حالت توسعه از گوشی روی همان وای‌فای (شبکه‌های خانگی)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  // فعال‌سازی Tailwind CSS (نسخه ۴) برای Turbopack
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  serverExternalPackages: ["argon2", "sharp", "@libsql/client", "node-cron"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
