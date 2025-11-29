import { db, systemSettingsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const settings = await db
      .select()
      .from(systemSettingsTable)
      .where(eq(systemSettingsTable.organizationId, params.orgId));

    if (settings.length === 0) {
      // Return default settings
      return NextResponse.json({
        language: "en",
        dateFormat: "DD/MM/YYYY",
        currency: "BDT",
        taxRate: 15,
      });
    }

    return NextResponse.json(settings[0]);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch system settings" },
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
    const { language, dateFormat, currency, taxRate } = body;

    // Check if settings already exist
    const existing = await db
      .select()
      .from(systemSettingsTable)
      .where(eq(systemSettingsTable.organizationId, params.orgId));

    if (existing.length > 0) {
      // Update existing
      const updated = await db
        .update(systemSettingsTable)
        .set({
          language,
          dateFormat,
          currency,
          taxRate,
          updatedAt: new Date(),
        })
        .where(eq(systemSettingsTable.id, existing[0].id))
        .returning();

      return NextResponse.json(updated[0]);
    }

    // Create new
    const newSettings = await db
      .insert(systemSettingsTable)
      .values({
        organizationId: params.orgId,
        language,
        dateFormat,
        currency,
        taxRate,
      })
      .returning();

    return NextResponse.json(newSettings[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save system settings" },
      { status: 500 }
    );
  }
}
