import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  roleId: z.number().int().optional(),
});

export async function registerAuthRoutes(server: FastifyInstance) {
  // POST /auth/login
  server.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { email, password } = parsed.data;

    // TODO: Replace with real user lookup + bcrypt.compare + JWT sign
    const token = server.jwt?.sign ? server.jwt.sign({ sub: 'placeholder-user-id', email }) : 'token-placeholder';

    return reply.send({
      token,
      expiresIn: 3600
    });
  });

  // POST /auth/register (admin only)
  server.post('/auth/register', { preHandler: [] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { email, password, name, roleId } = parsed.data;
    // Placeholder hashing to indicate security best practice
    const passwordHash = await bcrypt.hash(password, 10);

    // TODO: enforce RBAC; create user in DB with passwordHash
    return reply.status(201).send({
      id: 'new-user-id',
      email,
      name: name || null,
      roleId: roleId ?? null,
      isActive: true,
      passwordHash: '[hidden]'
    });
  });
}
