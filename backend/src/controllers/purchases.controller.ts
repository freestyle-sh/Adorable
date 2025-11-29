import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function registerPurchasesRoutes(server: FastifyInstance) {
  // POST /purchases/grn
  server.post('/purchases/grn', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    // TODO: validate supplier, update inventory, create GRN and invoice linkage
    const grn = await prisma.gRN.create({
      data: {
        grnNo: body.grnNo,
        supplierId: body.supplierId,
        totalAmount: body.totalAmount ?? 0,
      }
    });
    return reply.status(201).send(grn);
  });

  // Additional endpoints (purchase invoices, purchase approvals) to be added here
}
