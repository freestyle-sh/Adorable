import { db, stockBalanceTable, productsTable, warehouseTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { warehouseId } = req.nextUrl.searchParams;

    let query = db
      .select({
        warehouse: warehouseTable,
        product: productsTable,
        stock: stockBalanceTable,
      })
      .from(stockBalanceTable)
      .leftJoin(warehouseTable, eq(stockBalanceTable.warehouseId, warehouseTable.id))
      .leftJoin(productsTable, eq(stockBalanceTable.productId, productsTable.id));

    if (warehouseId) {
      query = query.where(eq(stockBalanceTable.warehouseId, warehouseId));
    }

    const results = await query;

    // Aggregate by warehouse
    const aggregated = results.reduce(
      (acc: any, item: any) => {
        const whId = item.warehouse?.id || "unknown";
        if (!acc[whId]) {
          acc[whId] = {
            warehouse: item.warehouse,
            products: [],
            totalQuantity: 0,
            totalValue: 0,
          };
        }
        acc[whId].products.push({
          product: item.product,
          quantity: item.stock?.quantity,
          costValue: item.stock?.costValue,
          averageCost: item.stock?.averageCost,
        });
        acc[whId].totalQuantity += parseFloat(item.stock?.quantity || 0);
        acc[whId].totalValue += parseFloat(item.stock?.costValue || 0);
        return acc;
      },
      {}
    );

    return NextResponse.json(Object.values(aggregated));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch stock report" },
      { status: 500 }
    );
  }
}
