import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { asrTranscribe } from "@/lib/ai-providers";

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

  // Стрипаем data-URL-префикс, заодно вытаскиваем MIME (браузер шлёт audio/webm)
  const mimeMatch = /^data:([^;,]+)/.exec(audioBase64);
  const mime = mimeMatch?.[1] || "audio/webm";
  const base64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
  const audio = Buffer.from(base64, "base64");

  try {
    // Коми-подсказка провайдеру (contextual biasing): приложение заранее знает
    // ожидаемую словоформу упражнения — передаём её ASR, чтобы декодер не
    // «сваливался» в русскую орфографию (коми записывается кириллицей, и
    // мультиязычные модели без подсказки транскрибируют «как русский»).
    // Готового языка «kv» ни у одного провайдера нет — это основной приём.
    // Выключается AI_ASR_HINT=0, если подсказка кажется «подсказыванием ответа».
    const hintOff = /^(0|false|no|off)$/i.test((process.env.AI_ASR_HINT || "").trim());
    const prompt =
      target && !hintOff
        ? `Речь на коми языке. Запиши услышанное коми буквами, дословно. Ожидаемая фраза упражнения: «${target}»`
        : undefined;

    // Провайдер выбирается env (zai | openai | yandex) — см. src/lib/ai-providers.ts
    const { text } = await asrTranscribe(audio, mime, prompt ? { prompt } : {});

    // If target provided, compute accuracy using Levenshtein distance
    let accuracy = 0;
    let feedback = "";
    if (target && text) {
      accuracy = computeAccuracy(normalizeForComparison(text), normalizeForComparison(target));
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

/**
 * Нормализация перед сравнением: убираем пунктуацию и лишние пробелы,
 * схлопываем і/и — ASR практически не различает эти коми буквы (обе
 * читаются близко, а модели обучены в основном на русском/украинском,
 * где і в коми-словах не встречается). Схлопывание симметрично для
 * транскрипта и образца, так что реальное замедление/палатализация
 * продолжает считаться ошибкой через остальные буквы.
 */
function normalizeForComparison(s: string): string {
  return s
    .toLowerCase()
    .replace(/і/g, "и")
    .replace(/[.,!?;:«»„“”"'‘’()\[\]{}\-–—_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
