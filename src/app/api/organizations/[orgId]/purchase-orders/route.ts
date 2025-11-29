import { db, purchaseOrderTable, purchaseOrderItemsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { safeMul } from "@/lib/erp-utils";

const PurchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.union([z.number(), z.string()]).transform((v) => Number(v)).refine((n) => Number.isFinite(n) && n > 0, "quantity must be > 0"),
  unitPrice: z.union([z.number(), z.string()]).transform((v) => Number(v)).refine((n) => Number.isFinite(n) && n >= 0, "unitPrice must be >= 0"),
});

const PurchaseOrderSchema = z.object({
  poNumber: z.string().min(1),
  supplierId: z.string().min(1),
  expectedDeliveryDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(PurchaseOrderItemSchema).min(1, "At least one item is required"),
  createdBy: z.string().min(1),
});

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
    const json = await req.json();
    const parsed = PurchaseOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { poNumber, supplierId, expectedDeliveryDate, notes, items, createdBy } = parsed.data;

    // Calculate totals using safeMul
    const totalAmountNum = items.reduce((sum, item) => sum + safeMul(item.unitPrice, item.quantity), 0);
    const totalAmount = String(totalAmountNum);

    // Create purchase order and items transactionally (drizzle on single connection; best-effort)
    const newPO = await db
      .insert(purchaseOrderTable)
      .values({
        organizationId: params.orgId,
        poNumber,
        supplierId,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        totalAmount,
        notes: notes ?? null,
        createdBy,
      })
      .returning();

    if (items && items.length > 0) {
      await db.insert(purchaseOrderItemsTable).values(
        items.map((item) => ({
          poId: newPO[0].id,
          productId: item.productId,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          lineTotal: String(safeMul(item.unitPrice, item.quantity)),
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
