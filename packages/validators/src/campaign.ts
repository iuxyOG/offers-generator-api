import { z } from 'zod'

export const createCampaignSchema = z.object({
  productId: z.string().uuid(),
  discountPercent: z.number().positive().max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export const campaignFiltersSchema = z.object({
  status: z.enum(['active', 'scheduled', 'ended', 'cancelled']).optional(),
  productId: z.string().uuid().optional(),
})

export type CreateCampaign = z.infer<typeof createCampaignSchema>
export type CampaignFilters = z.infer<typeof campaignFiltersSchema>
