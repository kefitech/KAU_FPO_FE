/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ["mayme-historiographic-joette.ngrok-free.dev"],
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    webpackBuildWorker: false,
  },
  // Turbopack config (dev server, Next.js 16+)
  turbopack: {},
  // Webpack config applies to production builds only (Turbopack handles dev)
  webpack: (config) => {
    config.cache = {
      type: "filesystem", // persist to disk instead of holding in RAM
      buildDependencies: { config: [import.meta.url] },
      maxMemoryGenerations: 1,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/django-api/:path*/",
        destination: "http://localhost:8000/api/:path*/",
      },
      {
        source: "/django-api/:path*",
        destination: "http://localhost:8000/api/:path*/",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/overview",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
