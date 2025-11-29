import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function registerAccountingRoutes(server: FastifyInstance) {
  // POST /accounting/vouchers
  server.post('/accounting/vouchers', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    // TODO: Validate COA codes, totals (debit == credit), create voucher & lines, post to ledger atomically
    const voucher = await prisma.voucher.create({
      data: {
        voucherNo: body.voucherNo,
        date: body.date ? new Date(body.date) : new Date(),
        totalDebit: body.totalDebit ?? 0,
        totalCredit: body.totalCredit ?? 0,
        lines: {
          create: (body.lines || []).map((l: any) => ({ coaId: l.coaId || l.coaCode, amount: l.amount, type: l.type }))
        }
      },
      include: { lines: true }
    });
    return reply.status(201).send(voucher);
  });

  // GET /accounting/vouchers
  server.get('/accounting/vouchers', async (request: FastifyRequest, reply: FastifyReply) => {
    const list = await prisma.voucher.findMany({ include: { lines: true } });
    return reply.send(list);
  });
}
