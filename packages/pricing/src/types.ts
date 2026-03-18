export interface PriceCalculationInput {
  originalPrice: number
  discountPercent: number
  minPrice: number
  minMargin: number
  costPrice: number
}

export interface PriceCalculationResult {
  finalPrice: number
  discountAmount: number
  margin: number
  isValid: boolean
  errors: string[]
}
