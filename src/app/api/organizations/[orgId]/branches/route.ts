import { db, branchTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const branches = await db
      .select()
      .from(branchTable)
      .where(eq(branchTable.organizationId, params.orgId));

    return NextResponse.json(branches);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch branches" },
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
    const { name, code, address, phone, warehouseId } = body;

    const newBranch = await db
      .insert(branchTable)
      .values({
        organizationId: params.orgId,
        name,
        code,
        address,
        phone,
        warehouseId,
      })
      .returning();

    return NextResponse.json(newBranch[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}
