// ============================================================
// «Коми кыв» — универсальный слой AI-провайдеров.
//
// Одна точка входа для трёх AI-функций проекта:
//   • TTS (озвучка слов)        → ttsSynthesize()
//   • ASR (анализ произношения) → asrTranscribe()
//   • LLM (тренажёр диалогов)   → chatCompletion()
//
// Провайдеры (выбираются env-переменными, можно смешивать):
//   • zai     — z-ai-web-dev-sdk, по умолчанию; конфиг .z-ai-config
//               (искать: CWD → ~/.z-ai-config → /etc/.z-ai-config)
//   • openai  — любой OpenAI-совместимый REST API: OpenAI, Groq,
//               LocalAI, vLLM, speaches/faster-whisper-server и т.п.
//               Ключ: AI_OPENAI_API_KEY (или OPENAI_API_KEY).
//   • yandex  — Yandex SpeechKit (TTS v2 + ASR v2 REST).
//               Ключ: AI_YANDEX_API_KEY (или YC_API_KEY) + folderId.
//
// Выбор провайдеров (env, по отдельности на каждую функцию):
//   AI_TTS_PROVIDER=zai|openai|yandex   (по умолчанию zai)
//   AI_ASR_PROVIDER=zai|openai|yandex   (по умолчанию zai)
//   AI_CHAT_PROVIDER=zai|openai         (по умолчанию zai)
//
// Контракт модуля: TTS всегда возвращает WAV (Buffer), ASR принимает
// аудио из браузера (webm/ogg/wav/mp3) и возвращает текст, chat
// возвращает completion в OpenAI-форме (choices[0].message.content).
// Полное описание настроек — DEPLOY.md §12.
// ============================================================

import { spawn } from "node:child_process";
import ZAI from "z-ai-web-dev-sdk";

// ---------- Публичные типы ----------

export interface TtsOptions {
  /** Имя голоса у провайдера (zai: tongtong; openai: alloy…; yandex: alena…) */
  voice?: string;
  /** Скорость речи (zai 0.5–2.0; openai 0.25–4.0; yandex игнорирует) */
  speed?: number;
}

export interface TtsResult {
  /** Синтезированное аудио, всегда WAV */
  audio: Buffer;
  mime: "audio/wav";
}

export interface AsrResult {
  /** Распознанный текст (может быть пустым, если тишина) */
  text: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

// ---------- Чтение env (первая непустая переменная из списка) ----------

function env(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

const ttsProvider = () => (env("AI_TTS_PROVIDER") || "zai").toLowerCase();
const asrProvider = () => (env("AI_ASR_PROVIDER") || "zai").toLowerCase();
const chatProvider = () => (env("AI_CHAT_PROVIDER") || "zai").toLowerCase();

/** Модель LLM по умолчанию для текущего провайдера чата */
export function defaultChatModel(): string {
  return chatProvider() === "openai" ? "gpt-4o-mini" : "qwen3.8-flash";
}

// ---------- Конфигурации провайдеров ----------

const openaiConfig = () => ({
  baseUrl: env("AI_OPENAI_BASE_URL", "OPENAI_BASE_URL") || "https://api.openai.com/v1",
  apiKey: env("AI_OPENAI_API_KEY", "OPENAI_API_KEY") || "",
  ttsPath: env("AI_TTS_PATH") || "/audio/speech",
  asrPath: env("AI_ASR_PATH") || "/audio/transcriptions",
  chatPath: env("AI_CHAT_PATH") || "/chat/completions",
  ttsModel: env("AI_TTS_MODEL") || "tts-1",
  ttsVoice: env("AI_TTS_VOICE") || "alloy",
  asrModel: env("AI_ASR_MODEL") || "whisper-1",
});

const yandexConfig = () => ({
  apiKey: env("AI_YANDEX_API_KEY", "YC_API_KEY", "YANDEX_API_KEY") || "",
  folderId: env("AI_YANDEX_FOLDER_ID", "YC_FOLDER_ID", "YANDEX_FOLDER_ID") || "",
  ttsVoice: env("AI_YANDEX_TTS_VOICE") || "alena",
  ttsLang: env("AI_YANDEX_LANG", "AI_YANDEX_TTS_LANG") || "ru-RU",
  asrLang: env("AI_YANDEX_ASR_LANG") || "ru-RU",
  // Переопределяется только при работе через собственный прокси (или в тестах)
  ttsUrl: env("AI_YANDEX_TTS_URL") || "https://tts.api.cloud.yandex.net/speech/v2/tts",
  asrUrl: env("AI_YANDEX_ASR_URL") || "https://stt.api.cloud.yandex.net/speech/v2/recognize",
});

// ---------- Утилиты ----------

/** Текст ошибки HTTP-ответа: статус + первые символы тела (не выбрасывает) */
async function httpError(prefix: string, res: Response): Promise<Error> {
  let body = "";
  try {
    body = (await res.text()).slice(0, 300);
  } catch {
    /* тело не читается — не важно */
  }
  return new Error(`${prefix}: HTTP ${res.status} ${body}`);
}

/** PCM16 mono → WAV (заголовок RIFF, 44 байта) — для Yandex TTS (format=lpcm) */
function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bits = 16): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // размер блока fmt
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * channels * bits) / 8, 28); // байт/сек
  header.writeUInt16LE((channels * bits) / 8, 32); // выравнивание блока
  header.writeUInt16LE(bits, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Расширение файла по MIME — для multipart-загрузки в OpenAI-совместимый ASR */
function mimeToExt(mime: string): string {
  if (/webm/i.test(mime)) return "webm";
  if (/ogg/i.test(mime)) return "ogg";
  if (/wav/i.test(mime)) return "wav";
  if (/mp4|m4a/i.test(mime)) return "m4a";
  if (/mp3|mpeg/i.test(mime)) return "mp3";
  return "webm";
}

/**
 * Переконтейнирование аудио (webm/opus → ogg/opus) через ffmpeg.
 * Кодек не перекодируется (-c:a copy) — быстро и без потерь.
 * Возвращает null, если ffmpeg не установлен или не смог.
 */
function remuxToOgg(input: Buffer): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", ["-i", "pipe:0", "-vn", "-c:a", "copy", "-f", "ogg", "pipe:1"], {
      stdio: ["pipe", "pipe", "ignore"],
    });
    const chunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (d: Buffer) => chunks.push(d));
    ffmpeg.on("error", () => resolve(null)); // ffmpeg не установлен
    ffmpeg.on("close", (code) => resolve(code === 0 && chunks.length > 0 ? Buffer.concat(chunks) : null));
    ffmpeg.stdin.on("error", () => undefined); // EPIPE при сбое — не роняем процесс
    ffmpeg.stdin.end(input);
  });
}

// ---------- TTS ----------

/** z.ai (как было до рефакторинга — без изменения поведения) */
async function zaiTts(text: string, opts: TtsOptions): Promise<TtsResult> {
  const zai = await ZAI.create();
  const response = await zai.audio.tts.create({
    input: text,
    voice: opts.voice || "tongtong",
    speed: opts.speed ?? 1.0,
    response_format: "wav",
    stream: false,
  } as any);
  const arrayBuffer = await (response as Response).arrayBuffer();
  return { audio: Buffer.from(new Uint8Array(arrayBuffer)), mime: "audio/wav" };
}

/** OpenAI-совместимый TTS: POST {base}/audio/speech → бинарный WAV */
async function openaiTts(text: string, opts: TtsOptions): Promise<TtsResult> {
  const c = openaiConfig();
  if (!c.apiKey) {
    throw new Error("AI_TTS_PROVIDER=openai: не задан ключ — заполните AI_OPENAI_API_KEY (или OPENAI_API_KEY)");
  }
  const speed = opts.speed ?? 1.0;
  const res = await fetch(c.baseUrl + c.ttsPath, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: c.ttsModel,
      input: text,
      voice: opts.voice || c.ttsVoice,
      response_format: "wav",
      speed: Math.min(4, Math.max(0.25, speed)),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw await httpError("OpenAI-совместимый TTS", res);
  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength === 0) throw new Error("OpenAI-совместимый TTS: пустой ответ");
  return { audio: Buffer.from(new Uint8Array(arrayBuffer)), mime: "audio/wav" };
}

/** Yandex SpeechKit TTS v2: lpcm 48kHz → оборачиваем в WAV */
async function yandexTts(text: string, opts: TtsOptions): Promise<TtsResult> {
  const c = yandexConfig();
  if (!c.apiKey) throw new Error("AI_TTS_PROVIDER=yandex: не задан AI_YANDEX_API_KEY (или YC_API_KEY)");
  if (!c.folderId) throw new Error("AI_TTS_PROVIDER=yandex: не задан AI_YANDEX_FOLDER_ID (или YC_FOLDER_ID)");
  const params = new URLSearchParams({
    text,
    lang: c.ttsLang,
    voice: opts.voice || c.ttsVoice,
    folderId: c.folderId,
    format: "lpcm",
    sampleRateHertz: "48000",
  });
  const res = await fetch(c.ttsUrl + "?" + params.toString(), {
    method: "POST",
    headers: { Authorization: `Api-Key ${c.apiKey}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw await httpError("Yandex TTS", res);
  const pcm = Buffer.from(new Uint8Array(await res.arrayBuffer()));
  if (pcm.length === 0) throw new Error("Yandex TTS: пустой ответ");
  return { audio: pcmToWav(pcm, 48000), mime: "audio/wav" };
}

/** Синтез речи. Провайдер — AI_TTS_PROVIDER (по умолчанию zai). */
export async function ttsSynthesize(text: string, opts: TtsOptions = {}): Promise<TtsResult> {
  switch (ttsProvider()) {
    case "zai":
      return zaiTts(text, opts);
    case "openai":
      return openaiTts(text, opts);
    case "yandex":
    case "speechkit":
      return yandexTts(text, opts);
    default:
      throw new Error(`AI_TTS_PROVIDER="${ttsProvider()}" не поддерживается (доступно: zai | openai | yandex)`);
  }
}

// ---------- ASR ----------

/** z.ai (как было до рефакторинга) */
async function zaiAsr(audio: Buffer): Promise<AsrResult> {
  const zai = await ZAI.create();
  const response = await zai.audio.asr.create({ file_base64: audio.toString("base64") } as any);
  const text =
    typeof response === "string" ? response : ((response as any)?.text || (response as any)?.transcript || "");
  return { text: String(text) };
}

/** OpenAI-совместимый ASR: POST {base}/audio/transcriptions (multipart) */
async function openaiAsr(audio: Buffer, mime: string): Promise<AsrResult> {
  const c = openaiConfig();
  if (!c.apiKey) {
    throw new Error("AI_ASR_PROVIDER=openai: не задан ключ — заполните AI_OPENAI_API_KEY (или OPENAI_API_KEY)");
  }
  const form = new FormData();
  const bytes = new Uint8Array(audio.byteLength);
  bytes.set(audio);
  form.append("file", new Blob([bytes], { type: mime || "audio/webm" }), `audio.${mimeToExt(mime)}`);
  form.append("model", c.asrModel);
  const res = await fetch(c.baseUrl + c.asrPath, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.apiKey}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw await httpError("OpenAI-совместимый ASR", res);
  const data: any = await res.json();
  const text = typeof data === "string" ? data : (data?.text || data?.transcript || "");
  return { text: String(text) };
}

/** Yandex SpeechKit ASR v2: понимает только OggOpus; webm переконтейнируем через ffmpeg */
async function yandexAsr(audio: Buffer, mime: string): Promise<AsrResult> {
  const c = yandexConfig();
  if (!c.apiKey) throw new Error("AI_ASR_PROVIDER=yandex: не задан AI_YANDEX_API_KEY (или YC_API_KEY)");
  if (!c.folderId) throw new Error("AI_ASR_PROVIDER=yandex: не задан AI_YANDEX_FOLDER_ID (или YC_FOLDER_ID)");

  let ogg = audio;
  if (!/ogg/i.test(mime)) {
    const converted = await remuxToOgg(audio);
    if (!converted) {
      throw new Error(
        `Yandex ASR: v2-REST принимает только OggOpus, браузер шлёт ${mime || "webm"} — ` +
          "для переконтейнирования нужен ffmpeg на сервере (apt install ffmpeg)"
      );
    }
    ogg = converted;
  }

  const params = new URLSearchParams({ topic: "general", lang: c.asrLang, folderId: c.folderId });
  const res = await fetch(c.asrUrl + "?" + params.toString(), {
    method: "POST",
    headers: { Authorization: `Api-Key ${c.apiKey}`, "Content-Type": "audio/ogg-opus" },
    body: new Uint8Array(ogg),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw await httpError("Yandex ASR", res);

  // v2-recognize возвращает текст (плоский или JSON — парсим оба варианта)
  const raw = await res.text();
  let text = raw;
  try {
    const parsed = JSON.parse(raw);
    text = parsed?.result ?? parsed?.text ?? raw;
  } catch {
    /* плоский текст — оставляем как есть */
  }
  return { text: String(text).trim() };
}

/**
 * Распознавание речи. Провайдер — AI_ASR_PROVIDER (по умолчанию zai).
 * mime — тип входного аудио (браузер MediaRecorder шлёт audio/webm).
 */
export async function asrTranscribe(audio: Buffer, mime = "audio/webm"): Promise<AsrResult> {
  switch (asrProvider()) {
    case "zai":
      return zaiAsr(audio);
    case "openai":
      return openaiAsr(audio, mime);
    case "yandex":
    case "speechkit":
      return yandexAsr(audio, mime);
    default:
      throw new Error(`AI_ASR_PROVIDER="${asrProvider()}" не поддерживается (доступно: zai | openai | yandex)`);
  }
}

// ---------- LLM-чат ----------

/** z.ai через SDK (конфиг .z-ai-config) */
async function zaiChat(params: ChatCompletionParams): Promise<any> {
  const zai = await ZAI.create();
  return zai.chat.completions.create(params as any);
}

/** OpenAI-совместимый чат: POST {base}/chat/completions → completion (OpenAI-форма) */
async function openaiChat(params: ChatCompletionParams): Promise<any> {
  const c = openaiConfig();
  if (!c.apiKey) {
    throw new Error("AI_CHAT_PROVIDER=openai: не задан ключ — заполните AI_OPENAI_API_KEY (или OPENAI_API_KEY)");
  }
  const res = await fetch(c.baseUrl + c.chatPath, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw await httpError("OpenAI-совместимый LLM", res);
  return await res.json();
}

/**
 * Запрос к LLM. Провайдер — AI_CHAT_PROVIDER (по умолчанию zai).
 * Возвращает completion в OpenAI-форме (choices[0].message.content),
 * поэтому существующий парсер диалогового роута работает без изменений.
 */
export async function chatCompletion(params: ChatCompletionParams): Promise<any> {
  switch (chatProvider()) {
    case "zai":
      return zaiChat(params);
    case "openai":
      return openaiChat(params);
    default:
      throw new Error(`AI_CHAT_PROVIDER="${chatProvider()}" не поддерживается (доступно: zai | openai)`);
  }
}
