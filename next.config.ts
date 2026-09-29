import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: every page, including one per model, is generated at build time into out/.
  output: "export",
};

export default nextConfig;
