import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.plugins.push(
      new (require("webpack").NormalModuleReplacementPlugin)(/^node:/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );
    return config;
  },
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit", "heic-convert", "heic-decode", "libheif-js", "jpeg-js", "pngjs"],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 180, 256, 384],
  },
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
