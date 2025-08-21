/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  typescript: {
    // !! WARN !!
    // Ignorar erros de TypeScript no build
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost', 'qrcred.vercel.app'],
  },
  // Ignore errors on build
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Ignorar erros durante a compilação
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    forceSwcTransforms: true,
  },
  // Configurar páginas que devem ser renderizadas dinamicamente
  output: 'standalone',
  // Configurar timeout de build
  staticPageGenerationTimeout: 120,
  webpack: (config, { dev }) => {
    // Ativar sourcemaps em desenvolvimento para depuração
    if (dev) {
      config.devtool = 'source-map';
    }
    // Important: return the modified config
    return config;
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig; 