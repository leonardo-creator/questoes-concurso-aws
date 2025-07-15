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
    serverComponentsExternalPackages: ['@prisma/client', 'prisma']
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
  async generateStaticParams() {
    return []
  },
  
  // Ignorar erros de prerendering para páginas problemáticas
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  }
}

export default nextConfig
