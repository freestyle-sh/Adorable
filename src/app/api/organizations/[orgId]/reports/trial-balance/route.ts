import { db, chartOfAccountsTable, ledgerTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    // Get all accounts with their balances
    const accounts = await db
      .select({
        id: chartOfAccountsTable.id,
        code: chartOfAccountsTable.accountCode,
        name: chartOfAccountsTable.accountName,
        type: chartOfAccountsTable.accountType,
        group: chartOfAccountsTable.accountGroup,
        balance: chartOfAccountsTable.balance,
      })
      .from(chartOfAccountsTable)
      .where(eq(chartOfAccountsTable.organizationId, params.orgId))
      .where(eq(chartOfAccountsTable.isActive, true));

    // Aggregate totals
    let totalDebit = 0;
    let totalCredit = 0;

    const trialBalanceItems = accounts.map((account) => {
      const balance = parseFloat(account.balance || 0);
      const debit = balance >= 0 ? balance : 0;
      const credit = balance < 0 ? Math.abs(balance) : 0;

      totalDebit += debit;
      totalCredit += credit;

      return {
        code: account.code,
        name: account.name,
        type: account.type,
        group: account.group,
        debit,
        credit,
      };
    });

    return NextResponse.json({
      reportDate: new Date().toISOString(),
      items: trialBalanceItems,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate trial balance" },
      { status: 500 }
    );
  }
}
