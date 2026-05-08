import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: process.env.GOOGLE_MAPS_MAP_ID,
  },
};

export default nextConfig;
