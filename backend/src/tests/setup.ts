import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { PrismaClient } from "@prisma/client";
import { registerControllers } from "../src/controllers";

export const prisma = new PrismaClient();
export let app: any;

beforeAll(async () => {
  app = Fastify({ logger: false });
  app.register(fastifyJwt, { secret: "test-secret" });
  await registerControllers(app);
  await app.ready();
});

beforeEach(async () => {
  const tables = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  for (const t of tables) {
    if (t.tablename !== "_prisma_migrations") {
      try {
        await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "${t.tablename}" RESTART IDENTITY CASCADE;`
        );
      } catch {}
    }
  }
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});
