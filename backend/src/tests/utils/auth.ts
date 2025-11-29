const { token } = await loginAsTestUser();
export { token };
import request from "supertest";
import bcrypt from "bcrypt";
import { prisma } from "../setup";
import { app } from "../setup";

/**
 * Creates (or reuses) a test user and logs them in to obtain a real JWT token.
 */
export async function loginAsTestUser() {
  const email = "testuser@example.com";
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 10);

  // Ensure test user exists
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: "Test User",
        passwordHash,
        isActive: true,
        role: {
          create: {
            name: "test-role",
            permissions: ["*"] // full access for testing
          }
        }
      }
    });
  }

  // Login to obtain JWT
  const res = await request(app.server)
    .post("/auth/login")
    .send({ email, password });

  if (res.status !== 200 || !res.body.token) {
    throw new Error(
      `Failed to obtain test JWT. Auth response: ${JSON.stringify(res.body)}`
    );
  }

  return { token: res.body.token, user };
}
