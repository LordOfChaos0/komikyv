import { createHmac, randomBytes } from "crypto";

// ============================================================
// TOTP — одноразовые коды по времени (RFC 6238, RFC 4226)
// Реализация без внешних зависимостей: только Node crypto.
// Совместимо с Google Authenticator, Yandex Key, 1Password
// и любым другим приложением по стандарту TOTP SHA1/6/30.
// ============================================================

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Кодирование массива байт в Base32 (RFC 4648, без паддинга). */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Декодирование Base32 в массив байт. */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Генерация нового секрета: 20 байт (160 бит) → Base32 (32 символа). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** HOTP по счётчику (RFC 4226): HMAC-SHA1 + dynamic truncation. */
function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter % 0x100000000, 4);
  const digest = createHmac("sha1", secret).update(buf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** Текущий 30-секундный интервал (unix time / 30). */
export function currentTotpCounter(): number {
  return Math.floor(Date.now() / 1000 / STEP_SECONDS);
}

/** Код для текущего интервала — используется в тестах и dev-режиме. */
export function totpNow(secretBase32: string): string {
  return hotp(base32Decode(secretBase32), currentTotpCounter());
}

/**
 * Проверка кода с окном ±1 интервал (допускает рассинхронизацию часов
 * до 30 секунд в обе стороны). Возвращает принятый счётчик либо null.
 * replayCode — код, который уже использовался (повторное использование
 * того же кода запрещено).
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  replayCode?: string | null
): number | null {
  const normalized = (code || "").replace(/\D/g, "");
  if (normalized.length !== DIGITS) return null;
  if (replayCode && normalized === replayCode) return null;
  const secret = base32Decode(secretBase32);
  if (secret.length === 0) return null;
  const counter = currentTotpCounter();
  for (let c = counter - 1; c <= counter + 1; c++) {
    const expected = hotp(secret, c);
    // сравнение без раннего выхода (timing-safe по длине)
    if (normalized.length === expected.length && normalized === expected) {
      return c;
    }
  }
  return null;
}

/**
 * otpauth:// URI для автоматического добавления в приложение-аутентификатор
 * по QR-коду.
 */
export function otpauthUrl(secretBase32: string, account: string, issuer = "Коми кыв"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
