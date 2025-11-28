import { db, purchaseOrderTable, purchaseOrderItemsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const purchaseOrders = await db
      .select()
      .from(purchaseOrderTable)
      .where(eq(purchaseOrderTable.organizationId, params.orgId));

    return NextResponse.json(purchaseOrders);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
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
    const {
      poNumber,
      supplierId,
      expectedDeliveryDate,
      notes,
      items,
      createdBy,
    } = body;

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

    // Create purchase order
    const newPO = await db
      .insert(purchaseOrderTable)
      .values({
        organizationId: params.orgId,
        poNumber,
        supplierId,
        expectedDeliveryDate: expectedDeliveryDate
          ? new Date(expectedDeliveryDate)
          : null,
        totalAmount,
        notes,
        createdBy,
      })
      .returning();

    // Create PO items
    if (items && items.length > 0) {
      await db.insert(purchaseOrderItemsTable).values(
        items.map((item: any) => ({
          poId: newPO[0].id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: (
            parseFloat(item.unitPrice) * parseFloat(item.quantity)
          ).toString(),
        }))
      );
    }

    return NextResponse.json(newPO[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
