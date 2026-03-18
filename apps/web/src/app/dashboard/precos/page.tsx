'use client'

import { useState, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { trpc } from '@/lib/trpc'

interface ProductRow {
  id: string
  sku: string
  nome: string
  custo: string
  precoBase: string
  precoMinimo: string
  estoque: number
  emCampanhaAtiva: boolean
  campaignPrices: {
    shopeePromo: string | null
    shopeeMin: string | null
    mlPromo: string | null
    mlMin: string | null
  } | null
}

function MargemBadge({ precoVenda, custo }: { precoVenda: number; custo: number }) {
  if (!precoVenda || !custo) return <span className="text-gray-400">-</span>
  const margem = ((precoVenda - custo) / precoVenda) * 100
  const color =
    margem >= 15 ? 'bg-green-100 text-green-800' :
    margem >= 5 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {margem.toFixed(1)}%
    </span>
  )
}

function EditableCell({
  value,
  productId,
  field,
  minPrice,
}: {
  value: string | null
  productId: string
  field: 'shopeePromo' | 'shopeeMin' | 'mlPromo' | 'mlMin'
  minPrice: string
}) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value ?? '')
  const [error, setError] = useState('')
  const utils = trpc.useUtils()
  const mutation = trpc.product.updatePrice.useMutation({
    onSuccess: () => {
      utils.product.list.invalidate()
    },
  })

  const save = useCallback(() => {
    setEditing(false)
    setError('')
    if (inputValue === (value ?? '')) return

    if (!inputValue || isNaN(parseFloat(inputValue))) {
      setInputValue(value ?? '')
      return
    }

    if (parseFloat(inputValue) < parseFloat(minPrice)) {
      setError(`Min: ${minPrice}`)
      setInputValue(value ?? '')
      return
    }

    mutation.mutate({ productId, field, value: inputValue })
  }, [inputValue, value, minPrice, productId, field, mutation])

  if (editing) {
    return (
      <div>
        <input
          type="number"
          step="0.01"
          min="0"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="w-24 rounded border px-2 py-1 text-sm"
          autoFocus
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-gray-100"
    >
      {value ?? '-'}
    </button>
  )
}

export default function PrecosPage() {
  const [search, setSearch] = useState('')
  const [accountId, setAccountId] = useState<string>()

  const { data: accountsData } = trpc.account.listActive.useQuery()
  const { data, isLoading, isError } = trpc.product.list.useQuery({
    search: search || undefined,
    accountId,
    limit: 50,
  })

  const syncMutation = trpc.product.syncCatalog.useMutation()

  const columns: ColumnDef<ProductRow>[] = [
    { accessorKey: 'sku', header: 'SKU', size: 120 },
    { accessorKey: 'nome', header: 'Nome', size: 200 },
    {
      accessorKey: 'custo',
      header: 'Custo',
      cell: ({ row }) => `R$ ${row.original.custo}`,
    },
    {
      accessorKey: 'precoBase',
      header: 'Preço Base',
      cell: ({ row }) => `R$ ${row.original.precoBase}`,
    },
    {
      accessorKey: 'precoMinimo',
      header: 'Preço Mín.',
      cell: ({ row }) => `R$ ${row.original.precoMinimo}`,
    },
    {
      id: 'shopeePromo',
      header: 'Shopee Promo',
      cell: ({ row }) => (
        <EditableCell
          value={row.original.campaignPrices?.shopeePromo ?? null}
          productId={row.original.id}
          field="shopeePromo"
          minPrice={row.original.precoMinimo}
        />
      ),
    },
    {
      id: 'shopeeMin',
      header: 'Shopee Mín.',
      cell: ({ row }) => (
        <EditableCell
          value={row.original.campaignPrices?.shopeeMin ?? null}
          productId={row.original.id}
          field="shopeeMin"
          minPrice={row.original.precoMinimo}
        />
      ),
    },
    {
      id: 'mlPromo',
      header: 'ML Promo',
      cell: ({ row }) => (
        <EditableCell
          value={row.original.campaignPrices?.mlPromo ?? null}
          productId={row.original.id}
          field="mlPromo"
          minPrice={row.original.precoMinimo}
        />
      ),
    },
    {
      id: 'mlMin',
      header: 'ML Mín.',
      cell: ({ row }) => (
        <EditableCell
          value={row.original.campaignPrices?.mlMin ?? null}
          productId={row.original.id}
          field="mlMin"
          minPrice={row.original.precoMinimo}
        />
      ),
    },
    {
      id: 'margem',
      header: 'Margem',
      cell: ({ row }) => (
        <MargemBadge
          precoVenda={parseFloat(row.original.campaignPrices?.shopeePromo ?? row.original.precoBase)}
          custo={parseFloat(row.original.custo)}
        />
      ),
    },
    {
      id: 'status',
      header: 'Campanha',
      cell: ({ row }) =>
        row.original.emCampanhaAtiva ? (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            Ativa
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        ),
    },
  ]

  const items = (data?.items as ProductRow[]) ?? []

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const showSkeleton = isLoading
  const showEmpty = !isLoading && items.length === 0
  const showTable = !isLoading && items.length > 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Painel de Preços</h2>
        <div className="flex items-center gap-3">
          {accountId && (
            <button
              onClick={() => syncMutation.mutate({ accountId })}
              disabled={syncMutation.isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {syncMutation.isLoading ? 'Sincronizando...' : 'Sync Catálogo'}
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          placeholder="Buscar SKU ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={accountId ?? ''}
          onChange={(e) => setAccountId(e.target.value || undefined)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todas as contas</option>
          {accountsData?.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {isError && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          Erro ao carregar produtos. Verifique a conexão com o banco.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {showSkeleton &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}

            {showEmpty && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nenhum produto encontrado.
                  {search && ' Tente outra busca.'}
                </td>
              </tr>
            )}

            {showTable &&
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {data?.nextCursor && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Mais produtos disponíveis — scroll ou busque para refinar
        </div>
      )}
    </div>
  )
}
