import { db, cylinderInventoryTable, productsTable, warehouseTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { warehouseId: string } }
) {
  try {
    const cylinders = await db
      .select({
        cylinder: cylinderInventoryTable,
        product: productsTable,
        warehouse: warehouseTable,
      })
      .from(cylinderInventoryTable)
      .leftJoin(productsTable, eq(cylinderInventoryTable.productId, productsTable.id))
      .leftJoin(warehouseTable, eq(cylinderInventoryTable.warehouseId, warehouseTable.id))
      .where(eq(cylinderInventoryTable.warehouseId, params.warehouseId));

    return NextResponse.json(cylinders);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch cylinder inventory" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { warehouseId: string } }
) {
  try {
    const body = await req.json();
    const { productId, cylinderId, status } = body;

    const newCylinder = await db
      .insert(cylinderInventoryTable)
      .values({
        warehouseId: params.warehouseId,
        productId,
        cylinderId,
        status: status || "empty",
      })
      .returning();

    return NextResponse.json(newCylinder[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add cylinder" },
      { status: 500 }
    );
  }
}
