import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.plugins.push(
      new (require("webpack").NormalModuleReplacementPlugin)(/^node:/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );
    if (isServer) {
      const nodeBuiltins = [
        "crypto", "zlib", "fs", "fs/promises", "path", "stream",
        "http", "https", "url", "util", "assert", "buffer",
        "child_process", "os", "net", "tls", "events", "querystring",
        "string_decoder", "punycode", "timers", "tty",
      ];
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]).filter(Boolean),
        ...nodeBuiltins,
      ];
    }
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
