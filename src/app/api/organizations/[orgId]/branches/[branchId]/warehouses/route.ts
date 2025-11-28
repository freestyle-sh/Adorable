import { db, warehouseTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { branchId: string } }
) {
  try {
    const warehouses = await db
      .select()
      .from(warehouseTable)
      .where(eq(warehouseTable.branchId, params.branchId));

    return NextResponse.json(warehouses);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { branchId: string } }
) {
  try {
    const body = await req.json();
    const { name, code, location, capacity } = body;

    const newWarehouse = await db
      .insert(warehouseTable)
      .values({
        branchId: params.branchId,
        name,
        code,
        location,
        capacity,
      })
      .returning();

    return NextResponse.json(newWarehouse[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create warehouse" },
      { status: 500 }
    );
  }
}
