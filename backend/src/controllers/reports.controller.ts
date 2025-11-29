import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function registerReportsRoutes(server: FastifyInstance) {
  // GET /reports/trial-balance
  server.get('/reports/trial-balance', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as any;
    // TODO: implement proper aggregation by COA and date range
    const from = q?.from ? new Date(q.from) : undefined;
    const to = q?.to ? new Date(q.to) : undefined;

    // Placeholder: aggregate vouchers into balances
    // Replace with proper ledger aggregation
    const vouchers = await prisma.voucher.findMany({ include: { lines: true } });

    // naive aggregation:
    const map: Record<string, { debit: number; credit: number }> = {};
    for (const v of vouchers) {
      for (const line of v.lines as any[]) {
        const key = line.coaId || 'unknown';
        map[key] = map[key] || { debit: 0, credit: 0 };
        if (line.type === 'DEBIT') map[key].debit += Number(line.amount);
        else map[key].credit += Number(line.amount);
      }
    }

    const balances = Object.entries(map).map(([coaCode, vals]) => ({ coaCode, debit: vals.debit, credit: vals.credit }));
    return reply.send({ period: { from: from?.toISOString() || null, to: to?.toISOString() || null }, balances });
  });

  // GET /reports/inventory-valuation
  server.get('/reports/inventory-valuation', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as any;
    const warehouseId = q?.warehouseId;
    const method = q?.method || 'WEIGHTED_AVERAGE';
    // TODO: implement proper valuation (weighted avg or FIFO) — this is a placeholder
    const inventory = await prisma.inventory.findMany({ where: warehouseId ? { warehouseId } : undefined, include: { item: true } });

    const breakdown = inventory.map((inv: any) => ({
      itemSku: inv.item?.sku || null,
      quantity: Number(inv.quantity),
      value: Number(inv.quantity) * Number(inv.item?.unitCost || 0)
    }));

    const totalValue = breakdown.reduce((s: number, b: any) => s + b.value, 0);
    return reply.send({ totalValue, breakdown });
  });
}
