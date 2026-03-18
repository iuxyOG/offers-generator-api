import { router } from './trpc'
import { productRouter } from './routers/product'
import { accountRouter } from './routers/account'
import { automationRouter } from './routers/automation'
import { promotionRouter } from './routers/promotion'
import { automationRuleRouter } from './routers/automation-rule'
import { automationLogRouter } from './routers/automation-log'

export const appRouter = router({
  product: productRouter,
  account: accountRouter,
  automation: automationRouter,
  promotion: promotionRouter,
  automationRule: automationRuleRouter,
  automationLog: automationLogRouter,
})

export type AppRouter = typeof appRouter
