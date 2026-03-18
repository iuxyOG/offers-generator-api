'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Providers } from '../providers'
import { useCurrentTenant } from '@/hooks/use-current-tenant'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/dashboard/contas', label: 'Contas' },
  { href: '/dashboard/precos', label: 'Preços' },
  { href: '/dashboard/promocoes', label: 'Promoções' },
  { href: '/dashboard/automacao', label: 'Automação' },
  { href: '/dashboard/logs', label: 'Logs' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { email, tenantId } = useCurrentTenant()

  return (
    <Providers>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 bg-white px-4 py-6">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-900">Ofertas</h1>
            <p className="text-sm text-gray-500">Automação Shopee</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto border-t border-gray-200 pt-4">
            <p className="truncate text-xs text-gray-500">{email}</p>
            <p className="truncate text-xs text-gray-400">Tenant: {tenantId}</p>
            <button
              onClick={logout}
              className="mt-2 text-xs text-red-600 hover:underline"
            >
              Sair
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </Providers>
  )
}
