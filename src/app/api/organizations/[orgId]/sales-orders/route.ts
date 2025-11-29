import { db, salesOrderTable, salesOrderItemsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { safeMul } from "@/lib/erp-utils";

const SalesOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.union([z.number(), z.string()]).transform((v) => Number(v)).refine((n) => Number.isFinite(n) && n > 0, "quantity must be > 0"),
  unitPrice: z.union([z.number(), z.string()]).transform((v) => Number(v)).refine((n) => Number.isFinite(n) && n >= 0, "unitPrice must be >= 0"),
});

const SalesOrderSchema = z.object({
  soNumber: z.string().min(1),
  customerId: z.string().min(1),
  branchId: z.string().min(1),
  deliveryDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(SalesOrderItemSchema).min(1, "At least one item is required"),
  createdBy: z.string().min(1),
});

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
    const json = await req.json();
    const parsed = SalesOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { soNumber, customerId, branchId, deliveryDate, notes, items, createdBy } = parsed.data;

    const totalAmountNum = items.reduce((sum, item) => sum + safeMul(item.unitPrice, item.quantity), 0);
    const totalAmount = String(totalAmountNum);

    const newSO = await db
      .insert(salesOrderTable)
      .values({
        organizationId: params.orgId,
        soNumber,
        customerId,
        branchId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        totalAmount,
        notes: notes ?? null,
        createdBy,
      })
      .returning();

    if (items && items.length > 0) {
      await db.insert(salesOrderItemsTable).values(
        items.map((item) => ({
          soId: newSO[0].id,
          productId: item.productId,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          lineTotal: String(safeMul(item.unitPrice, item.quantity)),
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
