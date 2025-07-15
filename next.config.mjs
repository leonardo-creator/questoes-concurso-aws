/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  // Configure for Vercel deployment
  poweredByHeader: false,
  compress: true
}

export default nextConfig
