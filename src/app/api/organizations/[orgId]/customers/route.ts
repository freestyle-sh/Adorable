import { db, customersTable, organizationTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const customers = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.organizationId, params.orgId));

    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch customers" },
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
      tradeLicense,
      creditLimit,
      paymentTerms,
    } = body;

    const newCustomer = await db
      .insert(customersTable)
      .values({
        organizationId: params.orgId,
        name,
        phone,
        email,
        address,
        city,
        country: country || "Bangladesh",
        binNumber,
        tradeLicense,
        creditLimit: creditLimit || "0",
        paymentTerms,
      })
      .returning();

    return NextResponse.json(newCustomer[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
