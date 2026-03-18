import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { runAutomation } from '../services/automation-run'

export const automationRouter = router({
  runNow: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        ruleId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await runAutomation({
        tenantId: ctx.tenantId,
        accountId: input.accountId,
        ruleId: input.ruleId,
      })
      return result
    }),
})
