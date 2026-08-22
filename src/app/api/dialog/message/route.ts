import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

const MessageSchema = z.object({
  scenarioId: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  message: z.string().min(1).max(500),
  language: z.enum(["komi", "ru"]).default("komi"),
});

const SYSTEM_PROMPT = `Ты — диалоговый тренажёр для изучения коми языка «Коми кыв».

Твоя задача:
1. Вести диалог с учеником на КОМИ ЯЗЫКЕ (если ученик пишет на русском, мягко поощряй его отвечать на коми, но если он просит перевод — переведи).
2. Использовать простую, грамматически правильную коми речь (уровень B1).
3. В скобках [RU: ...] давать краткий перевод сложных или новых слов на русский, чтобы ученик не терялся.
4. Если ученик допустил грамматическую ошибку, корректно повторить фразу в правильном виде и мягко объяснить.
5. Поддерживать контекст сценария (если задан).
6. Длина ответа: 1–2 коротких предложения на коми, плюс при необходимости пояснение по-русски.
7. НЕ пиши длинных лекций. Диалог должен быть живым.

Пример ответа:
«Бур, ме тэда тэнсьыд ним. Менам ним — Лука. [RU: Хорошо, я узнал твоё имя. Меня зовут Лука.] Кытӧн тэ олан?»

Помни: твой тон — дружелюбный, поддерживающий, как у старшего друга, помогающего учить язык.`;

// POST /api/dialog/message — send user message, get AI reply in Komi
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = MessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос", details: parsed.error.flatten() }, { status: 400 });
  }
  const { scenarioId, sessionId, message, language } = parsed.data;

  // Find or create session
  let session = sessionId
    ? await db.dialogSession.findUnique({ where: { id: sessionId } })
    : null;
  if (!session || session.userId !== user.id) {
    session = await db.dialogSession.create({
      data: {
        userId: user.id,
        scenarioId: scenarioId || null,
        status: "active",
        messagesJson: "[]",
      },
    });
  }

  // Build message history
  const history: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // If scenario, add context
  let scenario: any = null;
  if (session.scenarioId) {
    scenario = await db.dialogScenario.findUnique({ where: { id: session.scenarioId } });
    if (scenario) {
      const parsed = JSON.parse(scenario.scenarioJson);
      history.push({
        role: "system",
        content: `Сценарий диалога: «${scenario.title}». Контекст: ${parsed.context || scenario.description}. ${
          parsed.opening ? `Открывающая реплика тренажёра: ${parsed.opening}` : ""
        }. Цель ученика: ${parsed.goal || ""}. Ключевая лексика: ${(parsed.vocabulary || []).join(", ")}`,
      });
    }
  }

  const prevMessages = JSON.parse(session.messagesJson) as { role: string; content: string }[];
  for (const m of prevMessages) {
    history.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
  }
  // Add opening from scenario if it's the first message
  if (prevMessages.length === 0 && scenario) {
    const opening = JSON.parse(scenario.scenarioJson).opening;
    if (opening) {
      history.push({ role: "assistant", content: opening });
      prevMessages.push({ role: "assistant", content: opening });
    }
  }
  history.push({ role: "user", content: message });

  // Call LLM
  let assistantReply = "";
  let grammarFeedback = "";
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: history,
      temperature: 0.7,
      max_tokens: 350,
    });
    assistantReply = completion.choices?.[0]?.message?.content?.trim() || "Ме ог тӧда, мый шуны. [RU: Я не знаю, что сказать.]";
  } catch (e: any) {
    console.error("LLM error:", e?.message || e);
    return NextResponse.json(
      { error: "Не удалось получить ответ от нейросети. Попробуйте позже." },
      { status: 502 }
    );
  }

  // Optional second-pass: short grammar note
  try {
    const zai = await ZAI.create();
    const feedback = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Ты — методист по коми языку. Дай ОДНУ короткую подсказку по грамматике/лексике для ученика на основе его последней реплики. Ответ — одной строкой на русском, не более 80 символов. Если ошибок нет — ответь «Всё верно!»",
        },
        { role: "user", content: `Реплика ученика: «${message}»` },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });
    grammarFeedback = feedback.choices?.[0]?.message?.content?.trim() || "";
  } catch {
    grammarFeedback = "";
  }

  // Persist messages
  const updatedMessages = [
    ...prevMessages,
    { role: "user", content: message },
    { role: "assistant", content: assistantReply },
  ];
  await db.dialogSession.update({
    where: { id: session.id },
    data: { messagesJson: JSON.stringify(updatedMessages) },
  });

  return NextResponse.json({
    sessionId: session.id,
    reply: assistantReply,
    grammarFeedback,
    history: updatedMessages,
  });
}
