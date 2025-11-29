import { db, transitTable, transitItemsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TransitItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.union([z.number(), z.string()]).transform((v) => Number(v)).refine((n) => Number.isInteger(n) && n > 0, "quantity must be a positive integer"),
  costPerUnit: z.union([z.number(), z.string()]).transform((v) => Number(v)).refine((n) => Number.isFinite(n) && n >= 0, "costPerUnit must be >= 0"),
});

const TransitSchema = z.object({
  transitNumber: z.string().min(1),
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  expectedArrivalDate: z.string().datetime().optional().nullable(),
  items: z.array(TransitItemSchema).min(1, "At least one item is required"),
});

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
    const json = await req.json();
    const parsed = TransitSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { transitNumber, fromWarehouseId, toWarehouseId, expectedArrivalDate, items } = parsed.data;

    const totalQuantityNum = items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const totalQuantity = String(totalQuantityNum);

    const newTransit = await db
      .insert(transitTable)
      .values({
        organizationId: params.orgId,
        transitNumber,
        fromWarehouseId,
        toWarehouseId,
        expectedArrivalDate: expectedArrivalDate ? new Date(expectedArrivalDate) : null,
        totalQuantity,
      })
      .returning();

    if (items && items.length > 0) {
      await db.insert(transitItemsTable).values(
        items.map((item) => ({
          transitId: newTransit[0].id,
          productId: item.productId,
          quantity: String(item.quantity),
          costPerUnit: String(item.costPerUnit),
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
