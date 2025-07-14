/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  compress: true,
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  // Otimizações para performance
  poweredByHeader: false,
  generateEtags: false,
  // Configurações para lidar com arquivos grandes durante build
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // Otimizações de memória para build
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        maxSize: 244000, // 244kb chunks max
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
            maxSize: 244000,
          },
        },
      },
    };
    
    // Configurações de memória para builds grandes
    if (!dev) {
      config.cache = false; // Desabilitar cache durante build para economizar memória
    }
    
    return config;
  },
  // Excluir chunks do build para economizar espaço
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
})(nextConfig);
