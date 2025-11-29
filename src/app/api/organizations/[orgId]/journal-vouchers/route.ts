import {
  db,
  journalVoucherTable,
  journalEntryTable,
  ledgerTable,
  chartOfAccountsTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const vouchers = await db
      .select()
      .from(journalVoucherTable)
      .where(eq(journalVoucherTable.organizationId, params.orgId));

    return NextResponse.json(vouchers);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch journal vouchers" },
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
    const { voucherNumber, description, entries, createdBy, referenceDocumentId } =
      body;

    // Calculate totals
    let totalDebit = "0";
    let totalCredit = "0";

    if (entries && entries.length > 0) {
      entries.forEach((entry: any) => {
        if (entry.debit) totalDebit = (parseFloat(totalDebit) + parseFloat(entry.debit)).toString();
        if (entry.credit) totalCredit = (parseFloat(totalCredit) + parseFloat(entry.credit)).toString();
      });
    }

    // Create journal voucher
    const newVoucher = await db
      .insert(journalVoucherTable)
      .values({
        organizationId: params.orgId,
        voucherNumber,
        description,
        totalDebit,
        totalCredit,
        createdBy,
        referenceDocumentId,
      })
      .returning();

    // Create journal entries and ledger entries
    if (entries && entries.length > 0) {
      for (const entry of entries) {
        // Insert journal entry
        await db.insert(journalEntryTable).values({
          voucherId: newVoucher[0].id,
          accountId: entry.accountId,
          debit: entry.debit || "0",
          credit: entry.credit || "0",
          description: entry.description,
          lineNo: entry.lineNo,
        });

        // Insert ledger entry
        const account = await db
          .select()
          .from(chartOfAccountsTable)
          .where(eq(chartOfAccountsTable.id, entry.accountId));

        if (account.length > 0) {
          const newBalance =
            parseFloat(account[0].balance || 0) +
            parseFloat(entry.debit || 0) -
            parseFloat(entry.credit || 0);

          await db.insert(ledgerTable).values({
            organizationId: params.orgId,
            voucherId: newVoucher[0].id,
            accountId: entry.accountId,
            debit: entry.debit || "0",
            credit: entry.credit || "0",
            balance: newBalance.toString(),
            description: entry.description,
          });

          // Update account balance
          await db
            .update(chartOfAccountsTable)
            .set({ balance: newBalance.toString() })
            .where(eq(chartOfAccountsTable.id, entry.accountId));
        }
      }
    }

    return NextResponse.json(newVoucher[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create journal voucher" },
      { status: 500 }
    );
  }
}
