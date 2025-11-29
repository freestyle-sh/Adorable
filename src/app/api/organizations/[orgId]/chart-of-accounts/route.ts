import { db, chartOfAccountsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const accounts = await db
      .select()
      .from(chartOfAccountsTable)
      .where(eq(chartOfAccountsTable.organizationId, params.orgId));

    return NextResponse.json(accounts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch chart of accounts" },
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
    const { accountCode, accountName, accountType, accountGroup, subGroup } =
      body;

    const newAccount = await db
      .insert(chartOfAccountsTable)
      .values({
        organizationId: params.orgId,
        accountCode,
        accountName,
        accountType,
        accountGroup,
        subGroup,
      })
      .returning();

    return NextResponse.json(newAccount[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create chart of account" },
      { status: 500 }
    );
  }
}
