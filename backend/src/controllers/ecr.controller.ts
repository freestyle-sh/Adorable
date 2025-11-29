import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function registerEcrRoutes(server: FastifyInstance) {
  // POST /ecr
  server.post('/ecr', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    // TODO: validate branch, update inventory for empty cylinders, attach files
    const ecr = await prisma.eCR.create({
      data: {
        referenceNo: body.referenceNo,
        branchId: body.branchId,
        items: {
          create: (body.items || []).map((it: any) => ({ itemId: it.itemId, quantity: it.quantity }))
        }
      },
      include: { items: true }
    });
    return reply.status(201).send(ecr);
  });
}
    // GET /ecrs
  server.get('/ecrs', async (request: FastifyRequest, reply: FastifyReply) => {
    const list = await prisma.eCR.findMany({ include: { items: true } });
    return reply.send(list);
  });