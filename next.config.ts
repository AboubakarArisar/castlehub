import type { NextConfig } from "next";

// Cache Components is off: almost every CastleHub page reads the session or
// fresh rows, so the previous dynamic-rendering model is simpler here.
const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
