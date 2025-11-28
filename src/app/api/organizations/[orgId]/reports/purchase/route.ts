import {
  db,
  purchaseOrderTable,
  purchaseOrderItemsTable,
  suppliersTable,
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
        poNumber: purchaseOrderTable.poNumber,
        orderDate: purchaseOrderTable.orderDate,
        supplierName: suppliersTable.name,
        productName: productsTable.name,
        quantity: purchaseOrderItemsTable.quantity,
        unitPrice: purchaseOrderItemsTable.unitPrice,
        lineTotal: purchaseOrderItemsTable.lineTotal,
        totalAmount: purchaseOrderTable.totalAmount,
        status: purchaseOrderTable.status,
      })
      .from(purchaseOrderTable)
      .leftJoin(suppliersTable, eq(purchaseOrderTable.supplierId, suppliersTable.id))
      .leftJoin(
        purchaseOrderItemsTable,
        eq(purchaseOrderTable.id, purchaseOrderItemsTable.poId)
      )
      .leftJoin(
        productsTable,
        eq(purchaseOrderItemsTable.productId, productsTable.id)
      )
      .where(eq(purchaseOrderTable.organizationId, params.orgId));

    if (startDate) {
      query = query.where(eq(purchaseOrderTable.orderDate, new Date(startDate)));
    }

    const results = await query;

    // Aggregate purchases by PO
    const purchasesByPO: Record<string, any> = {};
    let totalPurchases = 0;
    let totalCompleted = 0;
    let totalPending = 0;

    results.forEach((row: any) => {
      if (!purchasesByPO[row.poNumber]) {
        purchasesByPO[row.poNumber] = {
          poNumber: row.poNumber,
          orderDate: row.orderDate,
          supplier: row.supplierName,
          items: [],
          totalAmount: parseFloat(row.totalAmount || 0),
          status: row.status,
        };
        totalPurchases += parseFloat(row.totalAmount || 0);

        if (row.status === "completed") {
          totalCompleted += parseFloat(row.totalAmount || 0);
        } else {
          totalPending += parseFloat(row.totalAmount || 0);
        }
      }

      if (row.productName) {
        purchasesByPO[row.poNumber].items.push({
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
      purchaseOrders: Object.values(purchasesByPO),
      summary: {
        totalPurchases,
        totalCompleted,
        totalPending,
        numberOfPOs: Object.keys(purchasesByPO).length,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate purchase report" },
      { status: 500 }
    );
  }
}
