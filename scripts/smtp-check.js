#!/usr/bin/env node
// ============================================================
// smtp-check.js — диагностика SMTP «Коми кыв» (запускать на VM)
//
// Что делает (по шагам):
//   [1] Находит и сравнивает .env: корневой и .next/standalone/.env
//       (приложение читает ТОЛЬКО второй — частая причина «SMTP не настроен»)
//   [2] Проверяет DNS и TCP-доступность SMTP_HOST:SMTP_PORT
//   [3] Показывает SMTP-баннер сервера (TLS/STARTTLS)
//   [4] Пробует аутентификацию (nodemailer verify)
//   [5] (опционально) отправляет тестовое письмо: --send
//
// Использование (из корня репозитория ~/komikyv):
//   node scripts/smtp-check.js                  — диагностика без отправки
//   node scripts/smtp-check.js --send           — + письмо самому себе
//   node scripts/smtp-check.js --send x@mail.ru — + письмо на адрес
//   node scripts/smtp-check.js --env /путь/.env — проверить конкретный файл
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const net = require("net");
const tls = require("tls");
const dns = require("dns").promises;
const nodemailer = require("nodemailer");

const C = { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", b: "\x1b[36m", x: "\x1b[0m", B: "\x1b[1m" };
const ok = (m) => console.log(`${C.g}  OK${C.x} ${m}`);
const bad = (m) => console.log(`${C.r}  XX ${m}${C.x}`);
const warn = (m) => console.log(`${C.y}  !  ${m}${C.x}`);
const info = (m) => console.log(`  ${m}`);
const step = (n, t) => console.log(`\n${C.B}${C.b}[${n}] ${t}${C.x}`);

// ---------- разбор .env (без dotenv, чтобы работать на любой VM) ----------
function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return null;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const mask = (s) => (s ? `${s.slice(0, 2)}***(${s.length} симв.)` : "(пусто)");

function tcpTest(host, port, timeout = 8000) {
  return new Promise((resolve) => {
    const s = net.Socket();
    s.setTimeout(timeout);
    s.once("connect", () => { s.destroy(); resolve({ ok: true }); });
    s.once("timeout", () => { s.destroy(); resolve({ ok: false, err: `таймаут ${timeout} мс — порт не отвечает` }); });
    s.once("error", (e) => resolve({ ok: false, err: e.code || e.message }));
    s.connect(port, host);
  });
}

function banner(host, port, useTls) {
  return new Promise((resolve) => {
    const s = useTls
      ? tls.connect({ host, port, servername: host, timeout: 10000 }, () => {})
      : net.connect({ host, port, timeout: 10000 }, () => {});
    let buf = "";
    const done = (err) => { s.destroy(); resolve({ err, banner: buf.trim().split("\n").slice(0, 3).join(" | ") }); };
    s.on("data", (d) => { buf += d.toString("utf8"); if (buf.includes("\n")) done(); });
    s.once("timeout", () => done(`таймаут приёма баннера`));
    s.once("error", (e) => done(`${e.code || ""} ${e.message}`));
  });
}

function decodeError(e) {
  const code = e.code || "";
  const resp = String(e.response || e.message || "");
  if (code === "EAUTH" || /535|5\.7\.8|auth/i.test(resp)) {
    return [
      "Сервер ОТКЛОНИЛ логин/пароль. Для Яндекс.Почты по порядку:",
      "  1) Почта: Настройки -> «Почтовые программы» — включить «С сервером smtp.yandex.ru»",
      "     (https://mail.yandex.ru/?lng=ru#setup/client);",
      "  2) Пароль: нужен ПАРОЛЬ ПРИЛОЖЕНИЯ (id.yandex.ru -> Безопасность -> Пароли приложений),",
      "     обычный пароль не работает, особенно при включённой 2FA;",
      "  3) Ящик должен быть активирован: хотя бы раз войти в веб-интерфейс;",
      "  4) Новый пароль приложения подождите ~10 мин после создания.",
    ].join("\n");
  }
  if (code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ESOCKET")
    return "Соединение не установлено — см. шаг сети выше (блокировка порта хостером).";
  if (/55[0-4]|5\.7\.1|reject|spoof/i.test(resp))
    return "Конверт (MAIL FROM) отклонён. Почти всегда SMTP_FROM != SMTP_USER: Яндекс отправляет письмо только от ящика авторизации (пример noreply@komikyv.ru из .env.example не существует). Исправление: SMTP_FROM=\"Коми кыв <тот-же-адрес-что-SMTP_USER>\" или удалите строку — код по умолчанию отправляет от SMTP_USER.";
  return `${code} ${resp}`;
}

async function main() {
  // ---------- аргументы ----------
  const argv = process.argv.slice(2);
  const sendIdx = argv.indexOf("--send");
  const doSend = sendIdx !== -1;
  const sendToArg = sendIdx !== -1 && argv[sendIdx + 1] && !argv[sendIdx + 1].startsWith("--") ? argv[sendIdx + 1] : null;
  const envIdx = argv.indexOf("--env");
  const envArg = envIdx !== -1 ? argv[envIdx + 1] : null;

  console.log(`${C.B}SMTP-диагностика «Коми кыв»${C.x}  (${new Date().toISOString().slice(0, 19)} UTC)`);

  // ---------- [1] конфигурация ----------
  step(1, "Конфигурация (.env)");

  const candidates = envArg
    ? [envArg]
    : [".env", path.join(".next", "standalone", ".env")].map((p) => path.resolve(p));

  const parsed = [];
  for (const f of candidates) {
    const v = parseEnv(f);
    if (v === null) {
      if (envArg || f === candidates[0]) warn(`нет файла: ${f}`);
      continue;
    }
    parsed.push({ file: f, vars: v });
  }

  if (parsed.length === 0) {
    bad("Файлы .env не найдены. Запускайте из корня репозитория (~/komikyv) или укажите --env /путь/.env");
    process.exit(1);
  }

  const SMTP_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
  for (const { file, vars } of parsed) {
    const host = vars.SMTP_HOST;
    info(`${C.B}${file}${C.x}`);
    if (!host || !vars.SMTP_USER || !vars.SMTP_PASS) {
      warn(`SMTP не настроен в этом файле: HOST/USER/PASS должны быть непустыми`);
    } else {
      info(`  HOST=${host}  PORT=${vars.SMTP_PORT || "465 (по умолчанию)"}`);
      info(`  USER=${vars.SMTP_USER}  PASS=${mask(vars.SMTP_PASS)}`);
      info(`  FROM=${vars.SMTP_FROM || `(по умолчанию: Коми кыв <${vars.SMTP_USER}>)`}`);
      if (vars.SMTP_FROM && vars.SMTP_USER) {
        const fromAddr = (vars.SMTP_FROM.match(/<([^>]+)>/) || [null, vars.SMTP_FROM])[1].trim();
        if (fromAddr.toLowerCase() !== vars.SMTP_USER.toLowerCase()) {
          warn(`SMTP_FROM (${fromAddr}) != SMTP_USER — Яндекс отклонит письмо (From должен совпадать с ящиком авторизации)`);
        }
      }
    }
  }

  // сравнение корневого и standalone env (главный источник «не работает»)
  if (!envArg && parsed.length === 2) {
    const [a, b] = parsed;
    const diff = SMTP_KEYS.filter((k) => (a.vars[k] || "") !== (b.vars[k] || ""));
    step(2, "Сравнение файлов .env");
    if (diff.length === 0) {
      ok(`корневой .env и .next/standalone/.env совпадают по SMTP-переменным`);
    } else {
      for (const k of diff) {
        bad(`${k}: корень=${JSON.stringify(a.vars[k] || "")} -> standalone=${JSON.stringify(b.vars[k] || "")}`);
      }
      bad("Приложение читает ТОЛЬКО .next/standalone/.env (WorkingDirectory сервиса).");
      info("Исправление:  cp .env .next/standalone/.env && sudo systemctl restart komikyv");
    }
  }

  // активная конфигурация = standalone (если есть), иначе первый файл
  const active = parsed.find((p) => p.file.includes("standalone")) || parsed[0];
  const cfg = {
    host: active.vars.SMTP_HOST,
    port: parseInt(active.vars.SMTP_PORT || "465", 10),
    user: active.vars.SMTP_USER,
    pass: active.vars.SMTP_PASS,
    from: active.vars.SMTP_FROM,
  };
  if (cfg.host) info(`\nПроверяем подключение по: ${cfg.host}:${cfg.port} (из ${path.basename(active.file)})`);

  if (!cfg.host || !cfg.user || !cfg.pass) {
    step(3, "Вердикт");
    bad("SMTP_* не заданы -> приложение работает в DEV-режиме: письма НЕ отправляются,");
    info("код подтверждения печатается в лог сервиса:");
    info("  sudo journalctl -u komikyv -n 300 --no-pager | grep 'DEV MODE'");
    info("Чтобы включить отправку — заполните SMTP_HOST/PORT/USER/PASS в ~/komikyv/.env,");
    info("скопируйте в .next/standalone/.env и перезапустите сервис (DEPLOY.md §14).");
    process.exit(1);
  }

  // ---------- DNS + TCP ----------
  const stepN = envArg ? 3 : parsed.length === 2 ? 3 : 2;
  step(stepN, `Сеть: DNS и TCP ${cfg.host}:${cfg.port}`);

  let netOk = false;
  try {
    const a = await dns.lookup(cfg.host);
    ok(`DNS: ${cfg.host} -> ${a.address}`);
  } catch (e) {
    bad(`DNS не резолвится: ${e.code || e.message} — проверьте SMTP_HOST (опечатка?)`);
  }

  const tcp = await tcpTest(cfg.host, cfg.port);
  if (tcp.ok) { ok(`TCP-порт ${cfg.port} доступен`); netOk = true; }
  else bad(`TCP: ${tcp.err}`);

  if (!netOk) {
    warn(`Возможная причина: хостер блокирует исходящий SMTP-трафик (анти-спам, часто 25/465).`);
    info("Что попробовать:");
    info("  1) SMTP_PORT=587 в .env (STARTTLS; код приложения поддерживает автоматически)");
    const t587 = await tcpTest(cfg.host, 587, 5000);
    t587.ok ? ok("порт 587 ДОСТУПЕН — переключитесь на него") : bad("порт 587 тоже закрыт");
    info("  2) если закрыты оба — тикет хостеру на открытие исходящего SMTP");
    info("  3) проверка общего интернета: curl -sI https://ya.ru | head -1");
  }

  // ---------- баннер ----------
  step(stepN + 1, "SMTP-баннер");
  const b = await banner(cfg.host, cfg.port, cfg.port === 465);
  if (b.err) bad(b.err);
  else { ok(b.banner); if (!/esmtp|smtp|ready/i.test(b.banner)) warn("баннер не похож на SMTP — проверьте хост/порт"); }

  // ---------- AUTH + отправка ----------
  step(stepN + 2, "Аутентификация (SMTP AUTH)");
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  let authOk = false;
  try {
    await transporter.verify();
    ok("Логин и пароль приняты сервером");
    authOk = true;
  } catch (e) {
    bad(decodeError(e));
    info(`(технический ответ: ${e.code || "-"} ${String(e.response || e.message).slice(0, 200)})`);
  }

  if (doSend) {
    step(stepN + 3, "Тестовая отправка письма");
    const to = sendToArg || cfg.user;
    try {
      const r = await transporter.sendMail({
        from: cfg.from || `Коми кыв <${cfg.user}>`,
        to,
        subject: "Коми кыв — тест SMTP",
        text: "Это автоматическое тестовое письмо диагностики scripts/smtp-check.js. Если вы его читаете — SMTP работает.",
      });
      ok(`Письмо принято сервером, id=${r.messageId}`);
      info(`Получатель: ${to}. Если письмо не придёт за ~5 минут — смотрите папку «Спам».`);
    } catch (e) {
      bad(decodeError(e));
    }
  } else {
    info("Отправить реальное тестовое письмо: node scripts/smtp-check.js --send");
  }

  step(stepN + 4, "Итог");
  if (authOk) {
    ok("SMTP-подключение работает — приложение сможет отправлять письма.");
    info("Если письма с сайта всё равно не приходят:");
    info("  • в логе отправки нет ошибок?  sudo journalctl -u komikyv -n 300 | grep -e 'Email send error' -e 'DEV MODE'");
    info("  • Если там 'DEV MODE' — сервис не видит .env: cp .env .next/standalone/.env && systemctl restart komikyv");
    info("  • Если 'Email send error: ...' — текст ошибки совпадает с расшифровкой выше.");
  } else {
    bad("Аутентификация не прошла — исправьте причину из расшифровки выше и повторите.");
    process.exit(1);
  }
}

main().catch((e) => { console.error("Неожиданная ошибка скрипта:", e); process.exit(1); });
