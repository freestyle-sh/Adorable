import { db, invoiceTable, invoiceItemsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const invoices = await db
      .select()
      .from(invoiceTable)
      .where(eq(invoiceTable.organizationId, params.orgId));

    return NextResponse.json(invoices);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
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
      invoiceNumber,
      customerId,
      soId,
      dueDate,
      items,
      notes,
      taxRate,
    } = body;

    // Calculate totals
    let subTotal = "0";
    if (items && items.length > 0) {
      subTotal = items
        .reduce(
          (sum: any, item: any) =>
            sum +
            parseFloat(item.unitPrice || 0) * parseFloat(item.quantity || 0),
          0
        )
        .toString();
    }

    const taxAmount = (parseFloat(subTotal) * (parseFloat(taxRate || 15) / 100)).toString();
    const totalAmount = (parseFloat(subTotal) + parseFloat(taxAmount)).toString();

    // Create invoice
    const newInvoice = await db
      .insert(invoiceTable)
      .values({
        organizationId: params.orgId,
        invoiceNumber,
        customerId,
        soId,
        dueDate: dueDate ? new Date(dueDate) : null,
        subTotal,
        taxAmount,
        totalAmount,
        notes,
      })
      .returning();

    // Create invoice items
    if (items && items.length > 0) {
      await db.insert(invoiceItemsTable).values(
        items.map((item: any) => ({
          invoiceId: newInvoice[0].id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: (
            parseFloat(item.unitPrice) * parseFloat(item.quantity)
          ).toString(),
        }))
      );
    }

    return NextResponse.json(newInvoice[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
