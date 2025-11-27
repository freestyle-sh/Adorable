import {
  db,
  purchaseOrderTable,
  purchaseOrderItemsTable,
  suppliersTable,
  productsTable,
} from "@/db/schema";
import { and, between, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

interface Row {
  poNumber: string;
  orderDate: Date | string | null;
  supplierName: string | null;
  productName: string | null;
  quantity: string | number | null;
  unitPrice: string | number | null;
  lineTotal: string | number | null;
  totalAmount: string | number | null;
  status: string | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    let whereClause = eq(purchaseOrderTable.organizationId, params.orgId);
    if (startDate && endDate) {
      whereClause = and(
        whereClause,
        between(purchaseOrderTable.orderDate, new Date(startDate), new Date(endDate))
      );
    } else if (startDate) {
      whereClause = and(whereClause, gte(purchaseOrderTable.orderDate, new Date(startDate)));
    } else if (endDate) {
      whereClause = and(whereClause, lte(purchaseOrderTable.orderDate, new Date(endDate)));
    }

    const results = await db
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
      .leftJoin(
        suppliersTable,
        eq(purchaseOrderTable.supplierId, suppliersTable.id)
      )
      .leftJoin(
        purchaseOrderItemsTable,
        eq(purchaseOrderTable.id, purchaseOrderItemsTable.poId)
      )
      .leftJoin(
        productsTable,
        eq(purchaseOrderItemsTable.productId, productsTable.id)
      )
      .where(whereClause);

    const purchasesByPO: Record<string, {
      poNumber: string;
      orderDate: string | null;
      supplier: string | null;
      items: Array<{ product: string; quantity: number; unitPrice: number; lineTotal: number }>;
      totalAmount: number;
      status: string | null;
    }> = {};

    let totalPurchases = 0;
    let totalCompleted = 0;
    let totalPending = 0;

    (results as Row[]).forEach((row) => {
      const poNumber = row.poNumber;
      if (!purchasesByPO[poNumber]) {
        const total = Number(row.totalAmount ?? 0);
        const status = row.status ?? "";
        purchasesByPO[poNumber] = {
          poNumber,
          orderDate: row.orderDate ? new Date(row.orderDate).toISOString() : null,
          supplier: row.supplierName ?? null,
          items: [],
          totalAmount: total,
          status,
        };
        totalPurchases += total;
        if (status.toLowerCase() === "completed") {
          totalCompleted += total;
        } else {
          totalPending += total;
        }
      }

      if (row.productName) {
        purchasesByPO[poNumber].items.push({
          product: row.productName,
          quantity: Number(row.quantity ?? 0),
          unitPrice: Number(row.unitPrice ?? 0),
          lineTotal: Number(row.lineTotal ?? 0),
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
