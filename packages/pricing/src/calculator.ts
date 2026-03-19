import type { PriceCalculationInput, PriceCalculationResult } from './types'

export function calcPrecoMinimo(
  custo: number,
  taxaShopee: number,
  margemMinima: number,
): number {
  // precoMinimo = custo / (1 - taxaShopee - margemMinima)
  const divisor = 1 - taxaShopee / 100 - margemMinima / 100
  if (divisor <= 0) return Infinity
  return Math.ceil((custo / divisor) * 100) / 100
}

export function calcMargem(
  precoVenda: number,
  custo: number,
  taxaShopee: number,
): number {
  if (precoVenda === 0) return 0
  const taxaValor = precoVenda * (taxaShopee / 100)
  const lucro = precoVenda - custo - taxaValor
  return Math.round((lucro / precoVenda) * 10000) / 100
}

export function calcPrecoComDesconto(precoBase: number, percentual: number): number {
  return Math.round(precoBase * (1 - percentual / 100) * 100) / 100
}

// Legacy exports for backwards compatibility
export function calculateDiscountedPrice(
  originalPrice: number,
  discountPercent: number,
): number {
  return calcPrecoComDesconto(originalPrice, discountPercent)
}

export function calculateMargin(sellingPrice: number, costPrice: number): number {
  if (sellingPrice === 0) return 0
  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 10000) / 100
}

export function validatePrice(input: PriceCalculationInput): PriceCalculationResult {
  const errors: string[] = []
  const finalPrice = calculateDiscountedPrice(input.originalPrice, input.discountPercent)
  const discountAmount = input.originalPrice - finalPrice
  const margin = calculateMargin(finalPrice, input.costPrice)

  if (finalPrice < input.minPrice) {
    errors.push(`Preço final (${finalPrice}) abaixo do mínimo (${input.minPrice})`)
  }

  if (margin < input.minMargin) {
    errors.push(`Margem (${margin}%) abaixo do mínimo (${input.minMargin}%)`)
  }

  return {
    finalPrice,
    discountAmount,
    margin,
    isValid: errors.length === 0,
    errors,
  }
}
