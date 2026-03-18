/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ofertas/validators', '@ofertas/db', '@ofertas/pricing', '@ofertas/rules'],
}

module.exports = nextConfig
