import { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth.controller';
import { registerItemRoutes } from './items.controller';
import { registerInventoryRoutes } from './inventory.controller';
import { registerTransitRoutes } from './transits.controller';
import { registerSalesRoutes } from './sales.controller';
import { registerPurchasesRoutes } from './purchases.controller';
import { registerEcrRoutes } from './ecr.controller';
import { registerAccountingRoutes } from './accounting.controller';
import { registerReportsRoutes } from './reports.controller';

/**
 * Register all route groups
 */
export async function registerControllers(server: FastifyInstance) {
  await registerAuthRoutes(server);
  await registerItemRoutes(server);
  await registerInventoryRoutes(server);
  await registerTransitRoutes(server);
  await registerSalesRoutes(server);
  await registerPurchasesRoutes(server);
  await registerEcrRoutes(server);
  await registerAccountingRoutes(server);
  await registerReportsRoutes(server);
}
