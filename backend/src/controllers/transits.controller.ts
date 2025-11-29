import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function registerTransitRoutes(server: FastifyInstance) {
  // POST /transits
  server.post('/transits', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    // TODO: Validate branches, items, create transit and transit items within transaction
    const transit = await prisma.transit.create({
      data: {
        transitNo: body.transitNo,
        sourceBranchId: body.sourceBranchId,
        destBranchId: body.destBranchId,
        status: 'DRAFT',
        items: {
          create: (body.items || []).map((it: any) => ({
            itemId: it.itemId,
            quantity: it.quantity
          }))
        }
      },
      include: { items: true }
    });
    return reply.status(201).send(transit);
  });

  // GET /transits
  server.get('/transits', async (request: FastifyRequest, reply: FastifyReply) => {
    const list = await prisma.transit.findMany({ include: { items: true } });
    return reply.send(list);
  });

  // POST /transits/{transitId}/status
  server.post('/transits/:transitId/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { transitId } = request.params as any;
    const body = request.body as any;
    const allowed = ['DRAFT', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

    if (!allowed.includes(body.status)) {
      return reply.status(400).send({ error: 'Invalid status' });
    }

    // TODO: validate state transitions, permissions, attachments requirement (ECR), wrap in transaction
    const updated = await prisma.transit.update({ where: { id: transitId }, data: { status: body.status } });
    return reply.send(updated);
  });
}
