import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

// POST /api/tts — synthesize speech for Komi/Russian text
// Body: { text: string, voice?: string, speed?: number, vocabId?: string }
// Returns: { audio: <base64 data url> }
// Caches result in vocabulary.audioBase64 when vocabId is provided.
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
  const { text, voice, speed, vocabId } = body as {
    text?: string;
    voice?: string;
    speed?: number;
    vocabId?: string;
  };
  if (!text || typeof text !== "string" || text.length === 0) {
    return NextResponse.json({ error: "Параметр text обязателен" }, { status: 400 });
  }
  if (text.length > 1024) {
    return NextResponse.json({ error: "Текст слишком длинный (макс. 1024 символа)" }, { status: 400 });
  }

  // Try cached audio for vocabulary entries
  if (vocabId) {
    const vocab = await db.vocabulary.findUnique({ where: { id: vocabId } });
    if (vocab?.audioBase64) {
      return NextResponse.json({ audio: vocab.audioBase64, cached: true });
    }
  }

  try {
    const zai = await ZAI.create();
    const response = await zai.audio.tts.create({
      input: text,
      voice: voice || "tongtong",
      speed: speed ?? 1.0,
      response_format: "wav",
      stream: false,
    } as any);

    // The SDK returns a standard Response object
    const arrayBuffer = await (response as Response).arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const base64Audio = buffer.toString("base64");
    const dataUrl = `data:audio/wav;base64,${base64Audio}`;

    // Cache for vocabulary
    if (vocabId) {
      await db.vocabulary.update({
        where: { id: vocabId },
        data: { audioBase64: dataUrl },
      }).catch(() => null);
    }

    return NextResponse.json({ audio: dataUrl, cached: false });
  } catch (e: any) {
    console.error("TTS error:", e?.message || e);
    return NextResponse.json(
      { error: "Не удалось синтезировать аудио", details: e?.message || String(e) },
      { status: 502 }
    );
  }
}
