import { describe, it, expect } from 'vitest'
import { checkEligibility } from './eligibility'
import type { ProductForEligibility, EligibilityConfig } from './types'

const baseProduto: ProductForEligibility = {
  id: '123',
  custo: 50,
  precoBase: 100,
  precoMinimo: 70,
  estoque: 20,
  emCampanhaAtiva: false,
}

const baseConfig: EligibilityConfig = {
  estoqueMinimo: 5,
  margemMinima: 10,
  taxaShopee: 12,
  estrategia: 'MODERADA',
}

describe('checkEligibility', () => {
  it('produto elegível retorna eligible=true com preço e margem', () => {
    const result = checkEligibility(baseProduto, baseConfig)
    expect(result.eligible).toBe(true)
    expect(result.precoRecomendado).toBeDefined()
    expect(result.margemEsperada).toBeDefined()
    expect(result.estrategia).toBe('MODERADA')
  })

  it('rejeita estoque insuficiente', () => {
    const result = checkEligibility(
      { ...baseProduto, estoque: 2 },
      baseConfig,
    )
    expect(result.eligible).toBe(false)
    expect(result.motivo).toContain('Estoque insuficiente')
  })

  it('rejeita produto em campanha ativa', () => {
    const result = checkEligibility(
      { ...baseProduto, emCampanhaAtiva: true },
      baseConfig,
    )
    expect(result.eligible).toBe(false)
    expect(result.motivo).toContain('campanha ativa')
  })

  it('rejeita preço abaixo do mínimo (estratégia agressiva)', () => {
    const result = checkEligibility(
      { ...baseProduto, precoMinimo: 90 },
      { ...baseConfig, estrategia: 'AGRESSIVA' },
    )
    // Agressiva = 25% desconto → precoBase 100 → 75. precoMinimo 90 → rejeitado
    expect(result.eligible).toBe(false)
    expect(result.motivo).toContain('abaixo do mínimo')
  })

  it('rejeita margem insuficiente', () => {
    const result = checkEligibility(
      { ...baseProduto, custo: 85 },
      { ...baseConfig, margemMinima: 20 },
    )
    expect(result.eligible).toBe(false)
    expect(result.motivo).toContain('Margem')
  })

  it('estratégia conservadora aplica menor desconto', () => {
    const result = checkEligibility(baseProduto, {
      ...baseConfig,
      estrategia: 'CONSERVADORA',
    })
    expect(result.eligible).toBe(true)
    // Conservadora = 8% → precoBase 100 → 92
    expect(result.precoRecomendado).toBe(92)
  })

  it('rejeita produto com custo=0', () => {
    const result = checkEligibility({ ...baseProduto, custo: 0 }, baseConfig)
    expect(result.eligible).toBe(false)
    expect(result.motivo).toContain('Custo não informado')
  })

  it('respeita descontoMax', () => {
    const result = checkEligibility(baseProduto, {
      ...baseConfig,
      estrategia: 'AGRESSIVA',
      descontoMax: 10,
    })
    expect(result.eligible).toBe(true)
    // AGRESSIVA=25 mas descontoMax=10 → precoBase 100 → 90
    expect(result.precoRecomendado).toBe(90)
  })
})
