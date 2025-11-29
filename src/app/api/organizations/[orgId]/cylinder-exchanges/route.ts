import { db, cylinderExchangeTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const exchanges = await db
      .select()
      .from(cylinderExchangeTable)
      .where(eq(cylinderExchangeTable.organizationId, params.orgId));

    return NextResponse.json(exchanges);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch cylinder exchanges" },
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
    const { exchangeNumber, customerId, emptyReturnedCount, refillIssuedCount } =
      body;

    const newExchange = await db
      .insert(cylinderExchangeTable)
      .values({
        organizationId: params.orgId,
        exchangeNumber,
        customerId,
        emptyReturnedCount: emptyReturnedCount || 0,
        refillIssuedCount: refillIssuedCount || 0,
        status: "completed",
      })
      .returning();

    return NextResponse.json(newExchange[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create cylinder exchange" },
      { status: 500 }
    );
  }
}
