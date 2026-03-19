import { calcMargem, calcPrecoComDesconto } from '@ofertas/pricing'
import type {
  ProductForEligibility,
  EligibilityConfig,
  EligibilityResult,
} from './types'
import { getDescontoByEstrategia } from './types'

export function checkEligibility(
  produto: ProductForEligibility,
  config: EligibilityConfig,
): EligibilityResult {
  // 0. Custo deve estar preenchido
  if (produto.custo <= 0) {
    return {
      eligible: false,
      motivo: 'Custo não informado (R$ 0). Preencha o custo antes de automatizar.',
    }
  }

  // 1. Estoque >= minimo
  if (produto.estoque < config.estoqueMinimo) {
    return {
      eligible: false,
      motivo: `Estoque insuficiente: ${produto.estoque} < ${config.estoqueMinimo}`,
    }
  }

  // 2. Não em campanha ativa
  if (produto.emCampanhaAtiva) {
    return {
      eligible: false,
      motivo: 'Produto já está em campanha ativa',
    }
  }

  // 3. Calcula preço promo baseado na estratégia
  const desconto = getDescontoByEstrategia(config.estrategia, config.descontoMax)
  const precoRecomendado = calcPrecoComDesconto(produto.precoBase, desconto)

  // 4. precoPromo >= precoMinimo
  if (precoRecomendado < produto.precoMinimo) {
    return {
      eligible: false,
      motivo: `Preço promocional (${precoRecomendado}) abaixo do mínimo (${produto.precoMinimo})`,
    }
  }

  // 5. Margem >= margemMinima
  const margem = calcMargem(precoRecomendado, produto.custo, config.taxaShopee)
  if (margem < config.margemMinima) {
    return {
      eligible: false,
      motivo: `Margem (${margem}%) abaixo do mínimo (${config.margemMinima}%)`,
    }
  }

  return {
    eligible: true,
    precoRecomendado,
    margemEsperada: margem,
    estrategia: config.estrategia,
  }
}
