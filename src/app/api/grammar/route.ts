import { NextRequest, NextResponse } from "next/server";
import { GRAMMAR_SECTIONS } from "@/lib/grammar-data";

// GET /api/grammar
// Optional: ?section=<id> to get a single section
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("section");

  if (sectionId) {
    const section = GRAMMAR_SECTIONS.find((s) => s.id === sectionId);
    if (!section) {
      return NextResponse.json({ error: "Раздел не найден" }, { status: 404 });
    }
    return NextResponse.json({ section });
  }

  // Return summary (without heavy content)
  return NextResponse.json({
    sections: GRAMMAR_SECTIONS.map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon,
      category: s.category,
      description: s.description,
      blocksCount: s.content.length,
    })),
  });
}
