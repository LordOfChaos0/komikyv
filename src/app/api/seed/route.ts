import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";

// POST /api/seed — triggers initial seed (idempotent)
export async function POST() {
  try {
    await seedDatabase();
    return NextResponse.json({ ok: true, message: "Seed completed" });
  } catch (e: any) {
    console.error("Seed error:", e);
    return NextResponse.json({ error: "Seed failed", details: e?.message || String(e) }, { status: 500 });
  }
}
