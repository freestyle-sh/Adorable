import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function registerItemRoutes(server: FastifyInstance) {
  // GET /items
  server.get('/items', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const page = Number(query?.page || 1);
    const perPage = Number(query?.perPage || 25);
    const q = query?.q || '';

    const where = q
      ? {
          OR: [
            { name: { contains: String(q), mode: 'insensitive' } },
            { sku: { contains: String(q), mode: 'insensitive' } }
          ]
        }
      : {};

    const total = await prisma.item.count({ where });
    const items = await prisma.item.findMany({
      where,
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({ total, items });
  });

  // POST /items
  server.post('/items', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    // TODO: Validate body, check itemType exists, permission checks
    const created = await prisma.item.create({
      data: {
        sku: body.sku,
        name: body.name,
        description: body.description || null,
        itemTypeId: body.itemTypeId,
        unitPrice: body.unitPrice ?? 0,
        unitCost: body.unitCost ?? 0,
        barcode: body.barcode ?? null,
        active: body.active ?? true
      }
    });
    return reply.status(201).send(created);
  });

  // GET /items/{itemId}
  server.get('/items/:itemId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { itemId } = request.params as any;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return reply.status(404).send({ error: 'Item not found' });
    return reply.send(item);
  });

  // PUT /items/{itemId}
  server.put('/items/:itemId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { itemId } = request.params as any;
    const body = request.body as any;
    // TODO: validation + RBAC
    const updated = await prisma.item.update({
      where: { id: itemId },
      data: {
        name: body.name,
        unitPrice: body.unitPrice,
        unitCost: body.unitCost,
        active: body.active
      }
    });
    return reply.send(updated);
  });

  // DELETE /items/{itemId} (soft-delete)
  server.delete('/items/:itemId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { itemId } = request.params as any;
    // Soft-delete: set active = false
    await prisma.item.update({ where: { id: itemId }, data: { active: false } });
    return reply.status(204).send();
  });
}
