import {
  db,
  invoiceTable,
  invoiceItemsTable,
  customersTable,
  productsTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { startDate, endDate } = req.nextUrl.searchParams;

    let query = db
      .select({
        invoiceNumber: invoiceTable.invoiceNumber,
        invoiceDate: invoiceTable.invoiceDate,
        customerName: customersTable.name,
        productName: productsTable.name,
        quantity: invoiceItemsTable.quantity,
        unitPrice: invoiceItemsTable.unitPrice,
        lineTotal: invoiceItemsTable.lineTotal,
        totalAmount: invoiceTable.totalAmount,
        paymentStatus: invoiceTable.paymentStatus,
      })
      .from(invoiceTable)
      .leftJoin(customersTable, eq(invoiceTable.customerId, customersTable.id))
      .leftJoin(invoiceItemsTable, eq(invoiceTable.id, invoiceItemsTable.invoiceId))
      .leftJoin(productsTable, eq(invoiceItemsTable.productId, productsTable.id))
      .where(eq(invoiceTable.organizationId, params.orgId));

    if (startDate) {
      query = query.where(eq(invoiceTable.invoiceDate, new Date(startDate)));
    }

    const results = await query;

    // Aggregate sales by invoice
    const salesByInvoice: Record<string, any> = {};
    let totalSales = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    results.forEach((row: any) => {
      if (!salesByInvoice[row.invoiceNumber]) {
        salesByInvoice[row.invoiceNumber] = {
          invoiceNumber: row.invoiceNumber,
          invoiceDate: row.invoiceDate,
          customer: row.customerName,
          items: [],
          totalAmount: parseFloat(row.totalAmount || 0),
          paymentStatus: row.paymentStatus,
        };
        totalSales += parseFloat(row.totalAmount || 0);

        if (row.paymentStatus === "paid") {
          totalPaid += parseFloat(row.totalAmount || 0);
        } else if (
          row.paymentStatus === "unpaid" ||
          row.paymentStatus === "overdue"
        ) {
          totalUnpaid += parseFloat(row.totalAmount || 0);
        }
      }

      if (row.productName) {
        salesByInvoice[row.invoiceNumber].items.push({
          product: row.productName,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          lineTotal: row.lineTotal,
        });
      }
    });

    return NextResponse.json({
      reportDate: new Date().toISOString(),
      period: { startDate, endDate },
      invoices: Object.values(salesByInvoice),
      summary: {
        totalSales,
        totalPaid,
        totalUnpaid,
        numberOfInvoices: Object.keys(salesByInvoice).length,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate sales report" },
      { status: 500 }
    );
  }
}
