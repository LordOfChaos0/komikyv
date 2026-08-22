import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

// POST /api/asr — transcribe user's audio recording and compare with target Komi word/phrase
// Body (JSON): { audioBase64: string, target?: string }
// audioBase64 must be a data URL like "data:audio/webm;base64,..."
// Returns: { transcript, accuracy (0-100), feedback }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const { audioBase64, target } = body as { audioBase64?: string; target?: string };
  if (!audioBase64 || typeof audioBase64 !== "string") {
    return NextResponse.json({ error: "Параметр audioBase64 обязателен" }, { status: 400 });
  }

  // Strip data URL prefix to get raw base64
  const base64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;

  try {
    const zai = await ZAI.create();
    const response = await zai.audio.asr.create({
      file_base64: base64,
    } as any);

    const text =
      typeof response === "string"
        ? response
        : (response as any)?.text ||
          (response as any)?.transcript ||
          "";

    // If target provided, compute accuracy using Levenshtein distance
    let accuracy = 0;
    let feedback = "";
    if (target && text) {
      accuracy = computeAccuracy(text.toLowerCase().trim(), target.toLowerCase().trim());
      if (accuracy === 100) feedback = "Отличное произношение!";
      else if (accuracy >= 80) feedback = "Хорошо! Почти идеально.";
      else if (accuracy >= 60) feedback = "Неплохо, но есть над чем поработать.";
      else feedback = "Попробуйте ещё раз, обращайте внимание на звуки ӧ, ы, и.";
    }

    return NextResponse.json({
      transcript: text,
      accuracy,
      feedback,
      target: target || null,
    });
  } catch (e: any) {
    console.error("ASR error:", e?.message || e);
    return NextResponse.json(
      { error: "Не удалось распознать речь", details: e?.message || String(e) },
      { status: 502 }
    );
  }
}

function computeAccuracy(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}
