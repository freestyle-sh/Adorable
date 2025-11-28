import { db, organizationTable } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const organizations = await db.select().from(organizationTable);
    return NextResponse.json(organizations);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, shortCode, registrationNumber, binNumber, country } = body;

    const newOrg = await db
      .insert(organizationTable)
      .values({
        name,
        shortCode,
        registrationNumber,
        binNumber,
        country: country || "Bangladesh",
      })
      .returning();

    return NextResponse.json(newOrg[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
