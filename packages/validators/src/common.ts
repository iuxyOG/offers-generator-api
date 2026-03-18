import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export type Pagination = z.infer<typeof paginationSchema>
