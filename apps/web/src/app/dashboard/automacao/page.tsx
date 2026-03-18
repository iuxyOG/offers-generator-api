'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

export default function AutomacaoPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')

  // Form state for rule creation/edit
  const [formNome, setFormNome] = useState('')
  const [formEstrategia, setFormEstrategia] = useState<'AGRESSIVA' | 'MODERADA' | 'CONSERVADORA'>('MODERADA')
  const [formDescontoMax, setFormDescontoMax] = useState(20)
  const [formMargemMinima, setFormMargemMinima] = useState(10)
  const [formEstoqueMinimo, setFormEstoqueMinimo] = useState(5)

  const utils = trpc.useUtils()
  const { data: accountsData } = trpc.account.listActive.useQuery()
  const { data: rules, isLoading } = trpc.automationRule.list.useQuery()
  const { data: metrics } = trpc.automationLog.metrics.useQuery()
  const { data: recentLogs } = trpc.automationLog.list.useQuery({ limit: 5 })

  const runMutation = trpc.automation.runNow.useMutation({
    onSuccess: () => {
      utils.automationLog.list.invalidate()
      utils.automationLog.metrics.invalidate()
      utils.automationRule.list.invalidate()
    },
  })
  const toggleMutation = trpc.automationRule.toggleActive.useMutation({
    onSuccess: () => utils.automationRule.list.invalidate(),
  })
  const createMutation = trpc.automationRule.create.useMutation({
    onSuccess: () => {
      utils.automationRule.list.invalidate()
      setShowModal(false)
    },
  })
  const updateMutation = trpc.automationRule.update.useMutation({
    onSuccess: () => {
      utils.automationRule.list.invalidate()
      setShowModal(false)
    },
  })

  function openEditModal(rule?: NonNullable<typeof rules>[number]) {
    if (rule) {
      setEditingRuleId(rule.id)
      setFormNome(rule.nome)
      setFormEstrategia((rule.estrategia ?? 'MODERADA') as typeof formEstrategia)
      const acoes = rule.acoesJson as Record<string, unknown>
      setFormDescontoMax((acoes?.descontoMax as number) ?? 20)
      setFormMargemMinima((acoes?.margemMinima as number) ?? 10)
      setFormEstoqueMinimo((acoes?.estoqueMinimo as number) ?? 5)
    } else {
      setEditingRuleId(null)
      setFormNome('')
      setFormEstrategia('MODERADA')
      setFormDescontoMax(20)
      setFormMargemMinima(10)
      setFormEstoqueMinimo(5)
    }
    setShowModal(true)
  }

  function handleSave() {
    const accountId = accountsData?.[0]?.id
    if (!accountId) return

    if (editingRuleId) {
      updateMutation.mutate({
        id: editingRuleId,
        nome: formNome,
        estrategia: formEstrategia,
        descontoMax: formDescontoMax,
        margemMinima: formMargemMinima,
        estoqueMinimo: formEstoqueMinimo,
      })
    } else {
      createMutation.mutate({
        accountId,
        nome: formNome,
        estrategia: formEstrategia,
        descontoMax: formDescontoMax,
        margemMinima: formMargemMinima,
        estoqueMinimo: formEstoqueMinimo,
      })
    }
  }

  async function testWebhook() {
    setWebhookStatus('testing')
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      })
      setWebhookStatus(res.ok ? 'ok' : 'error')
    } catch {
      setWebhookStatus('error')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Automação</h2>
        <button
          onClick={() => openEditModal()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nova Regra
        </button>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border bg-gray-100" />
            ))}
          </div>
        )}

        {!isLoading && (!rules || rules.length === 0) && (
          <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">Nenhuma regra configurada</p>
            <button
              onClick={() => openEditModal()}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Criar primeira regra
            </button>
          </div>
        )}

        {rules?.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center justify-between rounded-lg border bg-white p-4"
          >
            <div className="flex items-center gap-4">
              {/* Toggle */}
              <button
                onClick={() => toggleMutation.mutate({ id: rule.id })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  rule.ativo ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    rule.ativo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>

              <div>
                <p className="text-sm font-medium text-gray-900">{rule.nome}</p>
                <p className="text-xs text-gray-500">
                  Estratégia: {rule.estrategia}
                  {rule.lastRun && ` | Última execução: ${new Date(rule.lastRun).toLocaleString('pt-BR')}`}
                  {rule.lastResult && ` (${rule.lastResult})`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditModal(rule)}
                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  if (accountsData?.[0]) {
                    runMutation.mutate({
                      accountId: accountsData[0].id,
                      ruleId: rule.id,
                    })
                  }
                }}
                disabled={runMutation.isLoading}
                className="rounded bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 disabled:opacity-50"
              >
                Executar Agora
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Monitor section */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <h4 className="text-xs font-medium uppercase text-gray-500">Últimas 5 execuções</h4>
          <div className="mt-2 space-y-1">
            {(!recentLogs?.items || recentLogs.items.length === 0) && (
              <p className="text-sm text-gray-400">Nenhuma execução ainda</p>
            )}
            {recentLogs?.items.map((log) => (
              <div key={log.id} className="flex justify-between text-xs">
                <span className={
                  log.resultado === 'SUCESSO' ? 'text-green-600' :
                  log.resultado === 'FALHOU' ? 'text-red-600' : 'text-gray-500'
                }>
                  {log.resultado}
                </span>
                <span className="text-gray-400">
                  {new Date(log.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <h4 className="text-xs font-medium uppercase text-gray-500">Ações (24h)</h4>
          <p className="mt-2 text-3xl font-bold text-gray-900">{metrics?.totalAcoes24h ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <h4 className="text-xs font-medium uppercase text-gray-500">Taxa de Sucesso</h4>
          <p className="mt-2 text-3xl font-bold text-gray-900">{metrics?.taxaSucesso ?? 0}%</p>
        </div>
      </div>

      {/* Webhook n8n */}
      <div className="mt-8 rounded-lg border bg-white p-4">
        <h4 className="mb-3 text-sm font-medium">Webhook n8n</h4>
        <div className="flex items-center gap-3">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://n8n.seudominio.com/webhook/xxx"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={testWebhook}
            disabled={!webhookUrl || webhookStatus === 'testing'}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
          >
            {webhookStatus === 'testing' ? 'Testando...' : 'Testar Conexão'}
          </button>
          {webhookStatus === 'ok' && (
            <span className="text-sm text-green-600">Conectado</span>
          )}
          {webhookStatus === 'error' && (
            <span className="text-sm text-red-600">Falhou</span>
          )}
        </div>
      </div>

      {/* Rule creation/edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {editingRuleId ? 'Editar Regra' : 'Nova Regra'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome</label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Ex: Desconto agressivo eletrônicos"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Estratégia</label>
                <select
                  value={formEstrategia}
                  onChange={(e) => setFormEstrategia(e.target.value as typeof formEstrategia)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="CONSERVADORA">Conservadora (8%)</option>
                  <option value="MODERADA">Moderada (15%)</option>
                  <option value="AGRESSIVA">Agressiva (25%)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Desconto Máximo: {formDescontoMax}%
                </label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={formDescontoMax}
                  onChange={(e) => setFormDescontoMax(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Margem Mínima: {formMargemMinima}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={formMargemMinima}
                  onChange={(e) => setFormMargemMinima(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Estoque Mínimo: {formEstoqueMinimo}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formEstoqueMinimo}
                  onChange={(e) => setFormEstoqueMinimo(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {(createMutation.error || updateMutation.error) && (
              <div className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
                {createMutation.error?.message || updateMutation.error?.message}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formNome || createMutation.isLoading || updateMutation.isLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {(createMutation.isLoading || updateMutation.isLoading)
                  ? 'Salvando...'
                  : editingRuleId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
