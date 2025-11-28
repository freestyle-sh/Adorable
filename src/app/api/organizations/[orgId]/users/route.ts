import { db, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.organizationId, params.orgId));

    // Remove password hashes from response
    const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);

    return NextResponse.json(sanitizedUsers);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const body = await req.json();
    const { email, name, phone, role, branchIds, passwordHash } = body;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const newUser = await db
      .insert(usersTable)
      .values({
        organizationId: params.orgId,
        email,
        name,
        phone,
        role: role || "viewer",
        branchIds: branchIds ? JSON.stringify(branchIds) : null,
        passwordHash,
      })
      .returning();

    // Remove password from response
    const { passwordHash: _, ...userWithoutPassword } = newUser[0];

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
