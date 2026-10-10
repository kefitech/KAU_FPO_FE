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

  turbopack: {},

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "celkau.in",
      },
    ],
  },

  webpack: (config) => {
    config.cache = {
      type: "filesystem",
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
      // Expert booking pages moved under /expert/booking; keep old links working.
      {
        source: "/expert/stats",
        destination: "/expert/booking",
        permanent: true,
      },
      {
        source: "/expert/dashboard/fpo/:fpoId",
        destination: "/expert/booking/fpo/:fpoId",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;