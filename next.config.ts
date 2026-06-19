import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.43.197:3000", "192.168.43.197"],
};

export default nextConfig;
