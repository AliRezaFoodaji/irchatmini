import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Optional sub-path deployment: build with TARGET_PATH=/p/irchatmini to
  // serve the whole app under that prefix without touching the root site.
  // Empty string = served at the domain root.
  basePath: process.env.TARGET_PATH || "",
};

export default nextConfig;
