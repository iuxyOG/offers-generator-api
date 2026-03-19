'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { trpc } from '@/lib/trpc'

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'Conectada', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Desconectada', color: 'bg-gray-100 text-gray-800' },
  suspended: { label: 'Suspensa', color: 'bg-red-100 text-red-800' },
}

export default function ContasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Carregando...</div>}>
      <ContasContent />
    </Suspense>
  )
}

function ContasContent() {
  const searchParams = useSearchParams()
  const justConnected = searchParams.get('connected') === 'true'

  const utils = trpc.useUtils()
  const { data: accounts, isLoading } = trpc.account.listAll.useQuery()
  const disconnectMutation = trpc.account.disconnect.useMutation({
    onSuccess: () => utils.account.listAll.invalidate(),
  })

  const syncMutation = trpc.product.syncCatalog.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate()
    },
  })

  async function connectShopee() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    // Use credentials: include to send HttpOnly cookie for auth
    const res = await fetch(`${apiUrl}/auth/shopee/connect`, {
      credentials: 'include',
      redirect: 'manual',
    })
    // The API returns a redirect to Shopee — follow it
    const location = res.headers.get('location')
    if (location) {
      window.location.href = location
    } else {
      alert('Erro ao conectar com a Shopee. Faça login novamente.')
    }
  }

  function isTokenExpired(expiresAt: string | Date | null): boolean {
    if (!expiresAt) return true
    return new Date(expiresAt) < new Date()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Contas Shopee</h2>
        <button
          onClick={connectShopee}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          Conectar Loja Shopee
        </button>
      </div>

      {justConnected && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          Loja conectada com sucesso! Token de acesso salvo. Agora você pode sincronizar o catálogo.
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && (!accounts || accounts.length === 0) && (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <div className="mb-4 text-4xl">🏪</div>
          <p className="text-gray-500">Nenhuma loja conectada</p>
          <p className="mt-1 text-sm text-gray-400">
            Conecte sua primeira loja Shopee para começar a gerenciar preços e campanhas.
          </p>
          <button
            onClick={connectShopee}
            className="mt-4 rounded-md bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Conectar Loja Shopee
          </button>
        </div>
      )}

      <div className="space-y-3">
        {accounts?.map((acc) => {
          const status = statusLabels[acc.status] ?? statusLabels.inactive
          const expired = isTokenExpired(acc.shopeeTokenExpiresAt)
          const hasToken = !!acc.shopeeToken

          return (
            <div
              key={acc.id}
              className="rounded-lg border bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-gray-900">{acc.nome}</h3>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    {hasToken && expired && (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Token expirado
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm text-gray-500">
                    <p>Shop ID: {acc.shopeeShopId}</p>
                    {acc.shopeeTokenExpiresAt && (
                      <p>
                        Token expira: {new Date(acc.shopeeTokenExpiresAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Criada em {new Date(acc.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {acc.status === 'active' && hasToken && !expired && (
                    <button
                      onClick={() => syncMutation.mutate({ accountId: acc.id })}
                      disabled={syncMutation.isLoading}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {syncMutation.isLoading ? 'Sincronizando...' : 'Sincronizar Catálogo'}
                    </button>
                  )}
                  {acc.status === 'active' && hasToken && expired && (
                    <button
                      onClick={connectShopee}
                      className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600"
                    >
                      Reconectar
                    </button>
                  )}
                  {acc.status === 'active' && (
                    <button
                      onClick={() => {
                        if (confirm('Desconectar esta loja?')) {
                          disconnectMutation.mutate({ id: acc.id })
                        }
                      }}
                      disabled={disconnectMutation.isLoading}
                      className="rounded-md border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Desconectar
                    </button>
                  )}
                </div>
              </div>

              {syncMutation.isSuccess && (
                <div className="mt-3 rounded-md bg-green-50 p-2 text-xs text-green-700">
                  Catálogo sincronizado com sucesso!
                </div>
              )}
              {syncMutation.isError && (
                <div className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
                  Erro ao sincronizar: {syncMutation.error?.message}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
