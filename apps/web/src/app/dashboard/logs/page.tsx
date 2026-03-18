'use client'

import { useState, Fragment } from 'react'
import { trpc } from '@/lib/trpc'

const resultColors: Record<string, string> = {
  SUCESSO: 'bg-green-100 text-green-800',
  FALHOU: 'bg-red-100 text-red-800',
  IGNORADO: 'bg-gray-100 text-gray-800',
}

export default function LogsPage() {
  const [filterResult, setFilterResult] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data, isLoading } = trpc.automationLog.list.useQuery({
    resultado: (filterResult as 'SUCESSO' | 'FALHOU' | 'IGNORADO') || undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
    limit: 100,
  })
  const { data: metrics } = trpc.automationLog.metrics.useQuery()

  const logs = data?.items ?? []

  function exportCSV() {
    const header = 'ID,Resultado,Produto,Regra,Preço Calculado,Motivo,Data\n'
    const rows = logs
      .map(
        (l) =>
          `${l.id},${l.resultado},${l.produtoId ?? ''},${l.regraId ?? ''},${l.precoCalculado ?? ''},${(l.motivo ?? '').replace(/,/g, ';')},${l.createdAt}`,
      )
      .join('\n')

    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `automation-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Logs de Automação</h2>
        <button
          onClick={exportCSV}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Exportar CSV
        </button>
      </div>

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Total Ações (24h)</p>
          <p className="mt-1 text-2xl font-bold">{metrics?.totalAcoes24h ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Taxa de Sucesso</p>
          <p className="mt-1 text-2xl font-bold">{metrics?.taxaSucesso ?? 0}%</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Campanhas Auto (24h)</p>
          <p className="mt-1 text-2xl font-bold">{metrics?.campanhasAuto24h ?? 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-4">
        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todos os resultados</option>
          <option value="SUCESSO">Sucesso</option>
          <option value="FALHOU">Falhou</option>
          <option value="IGNORADO">Ignorado</option>
        </select>
        <input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Resultado</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Produto</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Regra</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Preço</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Motivo</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">API</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                  Nenhum log encontrado
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <Fragment key={log.id}>
                <tr className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${resultColors[log.resultado]}`}
                    >
                      {log.resultado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {log.produtoId?.slice(0, 8) ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {log.regraId?.slice(0, 8) ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {log.precoCalculado ? `R$ ${log.precoCalculado}` : '-'}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm" title={log.motivo ?? ''}>
                    {log.motivo ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    {log.apiResponse != null && (
                      <button
                        onClick={() =>
                          setExpandedRow(expandedRow === log.id ? null : log.id)
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {expandedRow === log.id ? 'Recolher' : 'Ver JSON'}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedRow === log.id && log.apiResponse != null && (
                  <tr>
                    <td colSpan={7} className="bg-gray-50 px-4 py-3">
                      <pre className="max-h-64 overflow-auto rounded bg-gray-900 p-3 text-xs text-green-400">
                        {JSON.stringify(log.apiResponse as Record<string, unknown>, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
