import {
  db,
  goodsReceiptNoteTable,
  grnItemsTable,
  stockBalanceTable,
  warehouseTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const grns = await db
      .select()
      .from(goodsReceiptNoteTable)
      .where(eq(goodsReceiptNoteTable.organizationId, params.orgId));

    return NextResponse.json(grns);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch goods receipt notes" },
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
    const { grnNumber, poId, warehouseId, items, createdBy } = body;

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

    // Create GRN
    const newGRN = await db
      .insert(goodsReceiptNoteTable)
      .values({
        organizationId: params.orgId,
        grnNumber,
        poId,
        warehouseId,
        totalAmount,
        createdBy,
      })
      .returning();

    // Create GRN items and update stock balance
    if (items && items.length > 0) {
      for (const item of items) {
        // Insert GRN item
        await db.insert(grnItemsTable).values({
          grnId: newGRN[0].id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: (
            parseFloat(item.unitPrice) * parseFloat(item.quantity)
          ).toString(),
        });

        // Update or create stock balance
        const existingStock = await db
          .select()
          .from(stockBalanceTable)
          .where(
            eq(stockBalanceTable.warehouseId, warehouseId) &
            eq(stockBalanceTable.productId, item.productId)
          );

        if (existingStock.length > 0) {
          const newQuantity =
            parseFloat(existingStock[0].quantity || 0) +
            parseFloat(item.quantity);
          const newCostValue =
            parseFloat(existingStock[0].costValue || 0) +
            parseFloat(item.lineTotal);
          const newAverageCost =
            newCostValue / (newQuantity || 1);

          await db
            .update(stockBalanceTable)
            .set({
              quantity: newQuantity.toString(),
              costValue: newCostValue.toString(),
              averageCost: newAverageCost.toString(),
              updatedAt: new Date(),
            })
            .where(eq(stockBalanceTable.id, existingStock[0].id));
        } else {
          const averageCost =
            parseFloat(item.lineTotal) / parseFloat(item.quantity);
          await db.insert(stockBalanceTable).values({
            warehouseId,
            productId: item.productId,
            quantity: item.quantity,
            costValue: item.lineTotal,
            averageCost: averageCost.toString(),
          });
        }
      }
    }

    return NextResponse.json(newGRN[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create goods receipt note" },
      { status: 500 }
    );
  }
}
