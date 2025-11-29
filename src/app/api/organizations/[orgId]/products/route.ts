import { db, productsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.organizationId, params.orgId));

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch products" },
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
      name,
      code,
      description,
      type,
      unit,
      weight,
      standardCost,
      sellingPrice,
    } = body;

    const newProduct = await db
      .insert(productsTable)
      .values({
        organizationId: params.orgId,
        name,
        code,
        description,
        type,
        unit: unit || "unit",
        weight,
        standardCost,
        sellingPrice,
      })
      .returning();

    return NextResponse.json(newProduct[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
