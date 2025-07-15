/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    forceSwcTransforms: true
  },
  serverExternalPackages: ['prisma', '@prisma/client'],
  poweredByHeader: false,
  compress: true,
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

export default nextConfig
