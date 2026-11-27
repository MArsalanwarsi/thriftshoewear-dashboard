/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
  webpack(config, options = {}) {
    if (!options.isServer) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: "all",
        maxInitialRequests: 25,
        minSize: 20000,
        maxSize: 450000,
        cacheGroups: {
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            name: "framework",
            chunks: "all",
            priority: 40,
          },
          redux: {
            test: /[\\/]node_modules[\\/](@reduxjs[\\/]toolkit|react-redux|redux|immer)[\\/]/,
            name: "redux-vendor",
            chunks: "all",
            priority: 30,
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: "radix-ui-vendor",
            chunks: "all",
            priority: 25,
          },
          recharts: {
            test: /[\\/]node_modules[\\/](recharts|d3-.*|victory-vendor)[\\/]/,
            name: "recharts-vendor",
            chunks: "all",
            priority: 22,
          },
          icons: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: "icons-vendor",
            chunks: "all",
            priority: 20,
          },
          commons: {
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
