'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

type Step = 'config' | 'produtos' | 'revisao'

interface WizardConfig {
  tipo: 'DISCOUNT' | 'FLASH_SALE' | 'COMBO'
  accountId: string
  inicio: string
  fim: string
}

interface SelectedProduct {
  id: string
  sku: string
  nome: string
  precoBase: string
  precoMinimo: string
  custo: string
  precoPromo: string
  margemPct: number
}

export default function NovaPromocaoPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('config')
  const [config, setConfig] = useState<WizardConfig>({
    tipo: 'DISCOUNT',
    accountId: '',
    inicio: '',
    fim: '',
  })
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])

  const { data: accountsData } = trpc.account.listActive.useQuery()
  const { data: productsData } = trpc.product.list.useQuery(
    { accountId: config.accountId || undefined, limit: 100 },
    { enabled: step === 'produtos' && !!config.accountId },
  )

  const createMutation = trpc.promotion.create.useMutation({
    onSuccess: () => {
      router.push('/dashboard/promocoes')
    },
  })

  function calcMargin(precoVenda: number, custo: number): number {
    if (precoVenda === 0) return 0
    return ((precoVenda - custo) / precoVenda) * 100
  }

  function toggleProduct(product: SelectedProduct) {
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id)
      if (exists) return prev.filter((p) => p.id !== product.id)
      return [...prev, product]
    })
  }

  function updatePromoPrice(productId: string, price: string) {
    setSelectedProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p
        const preco = parseFloat(price) || 0
        return {
          ...p,
          precoPromo: price,
          margemPct: calcMargin(preco, parseFloat(p.custo)),
        }
      }),
    )
  }

  function handleCreate() {
    createMutation.mutate({
      accountId: config.accountId,
      tipo: config.tipo,
      inicio: new Date(config.inicio).toISOString(),
      fim: new Date(config.fim).toISOString(),
      items: selectedProducts.map((p) => ({
        productId: p.id,
        precoPromo: p.precoPromo,
        precoMin: p.precoMinimo,
      })),
    })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Nova Promoção</h2>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-4">
        {(['config', 'produtos', 'revisao'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {i + 1}
            </div>
            <span className="text-sm capitalize">{s === 'config' ? 'Configuração' : s}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Config */}
      {step === 'config' && (
        <div className="space-y-4 rounded-lg border bg-white p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo</label>
            <select
              value={config.tipo}
              onChange={(e) =>
                setConfig({ ...config, tipo: e.target.value as WizardConfig['tipo'] })
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="DISCOUNT">Desconto</option>
              <option value="FLASH_SALE">Flash Sale</option>
              <option value="COMBO">Combo</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Conta</label>
            <select
              value={config.accountId}
              onChange={(e) => setConfig({ ...config, accountId: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {accountsData?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Início</label>
              <input
                type="datetime-local"
                value={config.inicio}
                onChange={(e) => setConfig({ ...config, inicio: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fim</label>
              <input
                type="datetime-local"
                value={config.fim}
                onChange={(e) => setConfig({ ...config, fim: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={() => setStep('produtos')}
            disabled={!config.accountId || !config.inicio || !config.fim}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Próximo
          </button>
        </div>
      )}

      {/* Step 2: Products */}
      {step === 'produtos' && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 font-semibold">Selecionar Produtos</h3>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {productsData?.items.map((item: Record<string, unknown>) => {
                const product = item as unknown as {
                  id: string; sku: string; nome: string; precoBase: string; precoMinimo: string; custo: string; emCampanhaAtiva: boolean
                }
                const isSelected = selectedProducts.some((p) => p.id === product.id)
                const defaultPromo = (parseFloat(product.precoBase) * 0.85).toFixed(2)

                return (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between rounded border p-3 ${
                      isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    } ${product.emCampanhaAtiva ? 'opacity-50' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (product.emCampanhaAtiva) return
                      toggleProduct({
                        id: product.id,
                        sku: product.sku,
                        nome: product.nome,
                        precoBase: product.precoBase,
                        precoMinimo: product.precoMinimo,
                        custo: product.custo,
                        precoPromo: defaultPromo,
                        margemPct: calcMargin(parseFloat(defaultPromo), parseFloat(product.custo)),
                      })
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {product.sku} - {product.nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        Base: R$ {product.precoBase} | Mín: R$ {product.precoMinimo}
                        {product.emCampanhaAtiva && ' | Em campanha ativa'}
                      </p>
                    </div>
                    {isSelected && (
                      <input
                        type="text"
                        value={selectedProducts.find((p) => p.id === product.id)?.precoPromo ?? ''}
                        onChange={(e) => {
                          e.stopPropagation()
                          updatePromoPrice(product.id, e.target.value)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-24 rounded border px-2 py-1 text-sm"
                        placeholder="Preço promo"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Real-time margin validation */}
          {selectedProducts.length > 0 && (
            <div className="rounded-lg border bg-white p-4">
              <h4 className="mb-2 text-sm font-medium">Margens dos produtos selecionados</h4>
              <div className="space-y-1">
                {selectedProducts.map((p) => {
                  const isLow = p.margemPct < 5
                  const isBelowMin = parseFloat(p.precoPromo) < parseFloat(p.precoMinimo)
                  return (
                    <div
                      key={p.id}
                      className={`flex justify-between text-xs ${
                        isLow || isBelowMin ? 'text-red-600' : 'text-gray-600'
                      }`}
                    >
                      <span>{p.sku}</span>
                      <span>
                        R$ {p.precoPromo} | Margem: {p.margemPct.toFixed(1)}%
                        {isBelowMin && ' (ABAIXO DO MÍNIMO!)'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('config')}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep('revisao')}
              disabled={selectedProducts.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Próximo ({selectedProducts.length} produtos)
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'revisao' && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 font-semibold">Revisão</h3>
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Tipo:</span> {config.tipo}
              </p>
              <p>
                <span className="font-medium">Período:</span>{' '}
                {config.inicio} a {config.fim}
              </p>
              <p>
                <span className="font-medium">Produtos:</span> {selectedProducts.length}
              </p>

              <div className="mt-4 rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-right">Preço Promo</th>
                      <th className="px-3 py-2 text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2">{p.sku}</td>
                        <td className="px-3 py-2">{p.nome}</td>
                        <td className="px-3 py-2 text-right">R$ {p.precoPromo}</td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={
                              p.margemPct >= 15
                                ? 'text-green-600'
                                : p.margemPct >= 5
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }
                          >
                            {p.margemPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {createMutation.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {createMutation.error.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('produtos')}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Voltar
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isLoading}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {createMutation.isLoading ? 'Criando...' : 'Criar Promoção'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
