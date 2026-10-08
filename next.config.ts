import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // Formularios clínicos largos; los archivos se suben directo a Storage desde el cliente.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
