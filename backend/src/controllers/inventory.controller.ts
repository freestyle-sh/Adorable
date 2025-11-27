import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const AdjustmentSchema = z.object({
  adjustmentType: z.enum(['INCREASE','TRANSFER_IN','DECREASE','TRANSFER_OUT','RESERVE','UNRESERVE']),
  amount: z.number().int().positive(),
});

export async function registerInventoryRoutes(server: FastifyInstance) {
  // GET /inventory
  server.get('/inventory', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as any;
    const warehouseId = q?.warehouseId as string | undefined;
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    const items = await prisma.inventory.findMany({ where, include: { item: true } });
    return reply.send(items);
  });

  // PATCH /inventory/{inventoryId}
  server.patch('/inventory/:inventoryId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { inventoryId } = request.params as any;
    const parsed = AdjustmentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { adjustmentType, amount } = parsed.data;

    const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } });
    if (!inv) return reply.status(404).send({ error: 'Inventory record not found' });

    let newQty = Number(inv.quantity);

    switch (adjustmentType) {
      case 'INCREASE':
      case 'TRANSFER_IN':
        newQty += amount;
        break;
      case 'DECREASE':
      case 'TRANSFER_OUT':
        newQty -= amount;
        break;
      case 'RESERVE':
        newQty -= amount;
        break;
      case 'UNRESERVE':
        newQty += amount;
        break;
    }

    if (newQty < 0) {
      return reply.status(400).send({ error: 'Insufficient quantity: operation would make stock negative' });
    }

    // Transactional update (simple single-row update)
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.inventory.findUnique({ where: { id: inventoryId }, select: { quantity: true } });
      if (!current) throw new Error('Inventory record not found during transaction');
      const curQty = Number(current.quantity);
      const newQuantity = curQty + (newQty - Number(inv.quantity));
      if (newQuantity < 0) throw new Error('Insufficient quantity');
      return tx.inventory.update({ where: { id: inventoryId }, data: { quantity: newQuantity } });
    });

    return reply.send(updated);
  });
}
