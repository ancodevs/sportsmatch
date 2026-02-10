import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Evita 404: las peticiones a favicon.ico usan el icono generado
      { source: "/favicon.ico", destination: "/icon" },
    ];
  },
};

export default nextConfig;
