import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ofertas - Automação Shopee',
  description: 'Automação de precificação e campanhas na Shopee',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  )
}
