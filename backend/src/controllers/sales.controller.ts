import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const SalesOrderItemSchema = z.object({
  itemId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const SalesOrderSchema = z.object({
  orderNo: z.string().min(1),
  customerId: z.number().int().positive(),
  items: z.array(SalesOrderItemSchema).min(1),
  totalAmount: z.number().nonnegative(),
});

export async function registerSalesRoutes(server: FastifyInstance) {
  // POST /sales/orders
  server.post('/sales/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = SalesOrderSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const body = parsed.data;

    const so = await prisma.salesOrder.create({
      data: {
        orderNo: body.orderNo,
        customerId: body.customerId,
        status: 'DRAFT',
        items: {
          create: (body.items || []).map((it) => ({
            itemId: it.itemId,
            quantity: it.quantity,
            unitPrice: it.unitPrice
          }))
        },
        totalAmount: body.totalAmount
      },
      include: { items: true }
    });
    return reply.status(201).send(so);
  });

  // GET /sales/orders
  server.get('/sales/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    const list = await prisma.salesOrder.findMany({ include: { items: true } });
    return reply.send(list);
  });

  // POST /sales/orders/{orderId}/status
  server.post('/sales/orders/:orderId/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { orderId } = request.params as any;
    const StatusSchema = z.object({ status: z.enum(['DRAFT','CONFIRMED','IN_TRANSIT','DELIVERED','CANCELLED']) });
    const parsed = StatusSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const updated = await prisma.$transaction(async (tx) => {
      // Placeholder for reservation handling on status transitions
      return tx.salesOrder.update({ where: { id: orderId }, data: { status: parsed.data.status } });
    });

    return reply.send(updated);
  });
}
