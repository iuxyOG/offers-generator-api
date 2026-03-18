'use client'

import { useState } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'

const statusColors: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-800',
  ATIVA: 'bg-green-100 text-green-800',
  ENCERRADA: 'bg-blue-100 text-blue-800',
  FALHOU: 'bg-red-100 text-red-800',
}

export default function PromocoesPage() {
  const [showDrawer, setShowDrawer] = useState(false)
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const { data, isLoading } = trpc.promotion.list.useQuery({ limit: 50 })
  const promotions = data?.items ?? []

  const { data: selectedPromo } = trpc.promotion.getById.useQuery(
    { id: selectedPromoId! },
    { enabled: !!selectedPromoId && showDrawer },
  )

  const endMutation = trpc.promotion.updateStatus.useMutation({
    onSuccess: () => {
      utils.promotion.list.invalidate()
      setShowConfirm(null)
    },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Promoções</h2>
        <Link
          href="/dashboard/promocoes/nova"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nova Promoção
        </Link>
      </div>

      {/* Promotions list */}
      <div className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border bg-gray-100" />
            ))}
          </div>
        )}

        {!isLoading && promotions.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">Nenhuma promoção encontrada</p>
            <Link
              href="/dashboard/promocoes/nova"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline"
            >
              Criar primeira promoção
            </Link>
          </div>
        )}

        {promotions.map((promo) => (
          <div
            key={promo.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center gap-4">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[promo.status] ?? 'bg-gray-100 text-gray-800'}`}
              >
                {promo.status}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {promo.tipo} #{promo.shopeePromotionId ?? 'Local'}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(promo.inicio).toLocaleDateString('pt-BR')} -{' '}
                  {new Date(promo.fim).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedPromoId(promo.id)
                  setShowDrawer(true)
                }}
                className="rounded px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
              >
                Detalhes
              </button>
              {promo.status === 'ATIVA' && (
                <button
                  onClick={() => setShowConfirm(promo.id)}
                  className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Encerrar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Drawer */}
      {showDrawer && selectedPromo && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowDrawer(false)}
          />
          <div className="relative w-96 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Detalhes da Promoção</h3>
              <button
                onClick={() => setShowDrawer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                X
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Tipo</label>
                <p className="text-sm">{selectedPromo.tipo}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Status</label>
                <p>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[selectedPromo.status]}`}
                  >
                    {selectedPromo.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Período</label>
                <p className="text-sm">
                  {new Date(selectedPromo.inicio).toLocaleString('pt-BR')} -{' '}
                  {new Date(selectedPromo.fim).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Shopee ID</label>
                <p className="text-sm">{selectedPromo.shopeePromotionId ?? '-'}</p>
              </div>

              {selectedPromo.items && selectedPromo.items.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Produtos ({selectedPromo.items.length})
                  </label>
                  <div className="mt-2 max-h-60 space-y-2 overflow-y-auto">
                    {selectedPromo.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded border border-gray-100 p-2 text-xs"
                      >
                        <p>Produto: {item.productId}</p>
                        <p>
                          Promo: R$ {item.precoPromo} | Mín: R$ {item.precoMin}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowConfirm(null)}
          />
          <div className="relative rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Encerrar Promoção?</h3>
            <p className="mb-4 text-sm text-gray-500">
              Esta ação não pode ser desfeita. A promoção será encerrada na Shopee.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  endMutation.mutate({ id: showConfirm, status: 'ENCERRADA' })
                }}
                disabled={endMutation.isLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {endMutation.isLoading ? 'Encerrando...' : 'Confirmar Encerramento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
