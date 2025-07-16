/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações de build
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // Configuração para Vercel deployment com APIs
  output: 'standalone',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // Configure for Vercel deployment
  poweredByHeader: false,
  compress: true,
  
  // Configurações para resolver problemas de deploy
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    missingSuspenseWithCSRBailout: false,
    // Desabilita otimizações que causam problemas com Context
    esmExternals: 'loose',
  },
  
  // Configurar para evitar problemas com APIs durante build
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // Configurações para ambiente de produção
  env: {
    NEXT_TELEMETRY_DISABLED: '1'
  },
  
  // Configurar para evitar problemas de prerendering em páginas específicas
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Skip static optimization for problematic pages
  async redirects() {
    return []
  },

  // Ensure proper behavior for dynamic pages
  async rewrites() {
    return []
  },
}

export default nextConfig
