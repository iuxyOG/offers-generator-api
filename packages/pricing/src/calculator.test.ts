import { describe, it, expect } from 'vitest'
import {
  calcPrecoMinimo,
  calcMargem,
  calcPrecoComDesconto,
  calculateDiscountedPrice,
  calculateMargin,
  validatePrice,
} from './calculator'

describe('calcPrecoMinimo', () => {
  it('calcula preço mínimo com taxa e margem', () => {
    // custo=50, taxa=12%, margem=15% → 50 / (1 - 0.12 - 0.15) = 50/0.73 ≈ 68.50
    expect(calcPrecoMinimo(50, 12, 15)).toBe(68.5)
  })

  it('retorna Infinity se taxa+margem >= 100%', () => {
    expect(calcPrecoMinimo(50, 50, 60)).toBe(Infinity)
  })
})

describe('calcMargem', () => {
  it('calcula margem com taxa Shopee', () => {
    // venda=100, custo=50, taxa=12% → lucro = 100-50-12 = 38 → 38/100 = 38%
    expect(calcMargem(100, 50, 12)).toBe(38)
  })

  it('retorna 0 quando preço é 0', () => {
    expect(calcMargem(0, 50, 12)).toBe(0)
  })
})

describe('calcPrecoComDesconto', () => {
  it('aplica desconto percentual', () => {
    expect(calcPrecoComDesconto(100, 10)).toBe(90)
    expect(calcPrecoComDesconto(199.9, 50)).toBe(99.95)
  })

  it('retorna preço original com desconto 0', () => {
    expect(calcPrecoComDesconto(100, 0)).toBe(100)
  })
})

describe('calculateDiscountedPrice (legacy)', () => {
  it('aplica desconto corretamente', () => {
    expect(calculateDiscountedPrice(100, 10)).toBe(90)
    expect(calculateDiscountedPrice(199.9, 50)).toBe(99.95)
  })
})

describe('calculateMargin (legacy)', () => {
  it('calcula margem corretamente', () => {
    expect(calculateMargin(100, 60)).toBe(40)
    expect(calculateMargin(50, 30)).toBe(40)
  })

  it('retorna 0 quando custo é 0', () => {
    expect(calculateMargin(100, 0)).toBe(0)
  })
})

describe('validatePrice', () => {
  it('valida preço dentro dos limites', () => {
    const result = validatePrice({
      originalPrice: 100,
      discountPercent: 10,
      minPrice: 80,
      minMargin: 20,
      costPrice: 50,
    })
    expect(result.isValid).toBe(true)
    expect(result.finalPrice).toBe(90)
    expect(result.errors).toHaveLength(0)
  })

  it('rejeita preço abaixo do mínimo', () => {
    const result = validatePrice({
      originalPrice: 100,
      discountPercent: 50,
      minPrice: 60,
      minMargin: 10,
      costPrice: 30,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors[0]).toContain('abaixo do mínimo')
  })

  it('rejeita margem abaixo do mínimo', () => {
    const result = validatePrice({
      originalPrice: 100,
      discountPercent: 10,
      minPrice: 50,
      minMargin: 50,
      costPrice: 60,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors[0]).toContain('Margem')
  })
})
