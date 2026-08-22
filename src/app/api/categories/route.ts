import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/categories
export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          modules: {
            where: {
              module: { status: "published", deletedAt: null },
            },
          },
        },
      },
    },
  });
  return NextResponse.json(
    categories.map((c) => ({
      ...c,
      modulesCount: (c as any)._count?.modules ?? 0,
    }))
  );
}
