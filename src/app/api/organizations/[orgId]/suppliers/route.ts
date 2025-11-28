import { db, suppliersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const suppliers = await db
      .select()
      .from(suppliersTable)
      .where(eq(suppliersTable.organizationId, params.orgId));

    return NextResponse.json(suppliers);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
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
      phone,
      email,
      address,
      city,
      country,
      binNumber,
      paymentTerms,
      leadTime,
    } = body;

    const newSupplier = await db
      .insert(suppliersTable)
      .values({
        organizationId: params.orgId,
        name,
        phone,
        email,
        address,
        city,
        country: country || "Bangladesh",
        binNumber,
        paymentTerms,
        leadTime,
      })
      .returning();

    return NextResponse.json(newSupplier[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
