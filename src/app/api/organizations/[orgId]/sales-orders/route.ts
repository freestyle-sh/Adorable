import { db, salesOrderTable, salesOrderItemsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const salesOrders = await db
      .select()
      .from(salesOrderTable)
      .where(eq(salesOrderTable.organizationId, params.orgId));

    return NextResponse.json(salesOrders);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch sales orders" },
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
    const { soNumber, customerId, branchId, deliveryDate, notes, items, createdBy } =
      body;

    // Calculate total amount
    let totalAmount = "0";
    if (items && items.length > 0) {
      totalAmount = items
        .reduce(
          (sum: any, item: any) =>
            sum +
            parseFloat(item.unitPrice || 0) * parseFloat(item.quantity || 0),
          0
        )
        .toString();
    }

    // Create sales order
    const newSO = await db
      .insert(salesOrderTable)
      .values({
        organizationId: params.orgId,
        soNumber,
        customerId,
        branchId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        totalAmount,
        notes,
        createdBy,
      })
      .returning();

    // Create SO items
    if (items && items.length > 0) {
      await db.insert(salesOrderItemsTable).values(
        items.map((item: any) => ({
          soId: newSO[0].id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: (
            parseFloat(item.unitPrice) * parseFloat(item.quantity)
          ).toString(),
        }))
      );
    }

    return NextResponse.json(newSO[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create sales order" },
      { status: 500 }
    );
  }
}
