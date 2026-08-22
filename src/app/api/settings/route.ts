import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/settings — current user's learning settings (stored in StudentProfile.settingsJson)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const profile = await db.studentProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });

  let settings: any = {};
  try {
    settings = JSON.parse(profile.settingsJson || "{}");
  } catch {
    settings = {};
  }

  // Defaults
  const merged = {
    theme: settings.theme || "light", // light | dark
    ttsVoice: settings.ttsVoice || "tongtong",
    ttsSpeed: typeof settings.ttsSpeed === "number" ? settings.ttsSpeed : 1.0,
    dailyGoalXp: typeof settings.dailyGoalXp === "number" ? settings.dailyGoalXp : 50,
    showTranscription: settings.showTranscription !== false,
    showTranslationHint: settings.showTranslationHint !== false,
    autoPlayTts: settings.autoPlayTts !== false,
    preferredLevel: settings.preferredLevel || "beginner",
    emailNotifications: settings.emailNotifications !== false,
    streakReminder: settings.streakReminder !== false,
    reducedMotion: settings.reducedMotion === true,
  };

  return NextResponse.json({ settings: merged });
}

const UpdateSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  ttsVoice: z.string().max(50).optional(),
  ttsSpeed: z.number().min(0.5).max(2.0).optional(),
  dailyGoalXp: z.number().int().min(10).max(500).optional(),
  showTranscription: z.boolean().optional(),
  showTranslationHint: z.boolean().optional(),
  autoPlayTts: z.boolean().optional(),
  preferredLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  emailNotifications: z.boolean().optional(),
  streakReminder: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
});

// PUT /api/settings — update user settings
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await db.studentProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });

  let current: any = {};
  try { current = JSON.parse(profile.settingsJson || "{}"); } catch { current = {}; }

  const updated = { ...current, ...parsed.data };
  await db.studentProfile.update({
    where: { userId: user.id },
    data: { settingsJson: JSON.stringify(updated) },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      entityType: "settings",
      entityId: user.id,
      action: "update",
      newValuesJson: JSON.stringify(parsed.data),
    },
  }).catch(() => null);

  return NextResponse.json({ settings: updated });
}
