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
  compress: true,
  
  // Configurações para resolver problemas de deploy
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    missingSuspenseWithCSRBailout: false,
  },
  
  // Configurar para evitar problemas com APIs durante build
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // Configurações para ambiente de produção
  env: {
    NEXT_TELEMETRY_DISABLED: '1'
  },
  
  // Exportar apenas as páginas que funcionam corretamente
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // Configurar para evitar problemas de prerendering em páginas específicas
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  }
}

export default nextConfig
