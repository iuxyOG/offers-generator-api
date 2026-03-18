export type Estrategia = 'AGRESSIVA' | 'MODERADA' | 'CONSERVADORA'

export interface ProductForEligibility {
  id: string
  custo: number
  precoBase: number
  precoMinimo: number
  estoque: number
  emCampanhaAtiva: boolean
}

export interface EligibilityConfig {
  estoqueMinimo: number
  margemMinima: number
  taxaShopee: number
  estrategia: Estrategia
  descontoMax?: number
}

export interface EligibilityResult {
  eligible: boolean
  motivo?: string
  precoRecomendado?: number
  margemEsperada?: number
  estrategia?: Estrategia
}

const ESTRATEGIA_DESCONTO: Record<Estrategia, number> = {
  AGRESSIVA: 25,
  MODERADA: 15,
  CONSERVADORA: 8,
}

export function getDescontoByEstrategia(estrategia: Estrategia, descontoMax?: number): number {
  const base = ESTRATEGIA_DESCONTO[estrategia]
  return descontoMax !== undefined ? Math.min(base, descontoMax) : base
}
