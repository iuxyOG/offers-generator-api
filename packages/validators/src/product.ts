import { z } from 'zod'

export const productSchema = z.object({
  shopeeItemId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  originalPrice: z.number().positive(),
  minPrice: z.number().positive(),
  stock: z.number().int().nonnegative(),
  minStock: z.number().int().nonnegative().default(0),
})

export const updateProductSchema = productSchema.partial().omit({ shopeeItemId: true })

export type Product = z.infer<typeof productSchema>
export type UpdateProduct = z.infer<typeof updateProductSchema>
