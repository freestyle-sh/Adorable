import { db, transitTable, transitItemsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const transits = await db
      .select()
      .from(transitTable)
      .where(eq(transitTable.organizationId, params.orgId));

    return NextResponse.json(transits);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch transits" },
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
      transitNumber,
      fromWarehouseId,
      toWarehouseId,
      expectedArrivalDate,
      items,
    } = body;

    // Calculate total quantity
    let totalQuantity = "0";
    if (items && items.length > 0) {
      totalQuantity = items
        .reduce(
          (sum: any, item: any) => sum + parseFloat(item.quantity || 0),
          0
        )
        .toString();
    }

    // Create transit
    const newTransit = await db
      .insert(transitTable)
      .values({
        organizationId: params.orgId,
        transitNumber,
        fromWarehouseId,
        toWarehouseId,
        expectedArrivalDate: expectedArrivalDate
          ? new Date(expectedArrivalDate)
          : null,
        totalQuantity,
      })
      .returning();

    // Create transit items
    if (items && items.length > 0) {
      await db.insert(transitItemsTable).values(
        items.map((item: any) => ({
          transitId: newTransit[0].id,
          productId: item.productId,
          quantity: item.quantity,
          costPerUnit: item.costPerUnit,
        }))
      );
    }

    return NextResponse.json(newTransit[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create transit" },
      { status: 500 }
    );
  }
}
