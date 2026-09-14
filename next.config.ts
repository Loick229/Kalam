import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les couvertures sont servies par Supabase Storage via des URL signées.
  images: { unoptimized: true },
};

export default nextConfig;
