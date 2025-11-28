import { db, paymentReceiptTable, invoiceTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const receipts = await db
      .select()
      .from(paymentReceiptTable)
      .where(eq(paymentReceiptTable.organizationId, params.orgId));

    return NextResponse.json(receipts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch payment receipts" },
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
      receiptNumber,
      invoiceId,
      customerId,
      amount,
      paymentMethod,
      referenceNumber,
    } = body;

    // Create payment receipt
    const newReceipt = await db
      .insert(paymentReceiptTable)
      .values({
        organizationId: params.orgId,
        receiptNumber,
        invoiceId,
        customerId,
        amount,
        paymentMethod,
        referenceNumber,
      })
      .returning();

    // Update invoice payment status
    const invoice = await db
      .select()
      .from(invoiceTable)
      .where(eq(invoiceTable.id, invoiceId));

    if (invoice.length > 0) {
      const invoiceAmount = parseFloat(invoice[0].totalAmount || 0);
      const paymentAmount = parseFloat(amount);

      let newStatus = "unpaid";
      if (paymentAmount >= invoiceAmount) {
        newStatus = "paid";
      } else if (paymentAmount > 0) {
        newStatus = "partial";
      }

      await db
        .update(invoiceTable)
        .set({ paymentStatus: newStatus })
        .where(eq(invoiceTable.id, invoiceId));
    }

    return NextResponse.json(newReceipt[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create payment receipt" },
      { status: 500 }
    );
  }
}
