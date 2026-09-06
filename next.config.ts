import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // сокращает клиентский бандл: тянутся только используемые иконки и графики
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
