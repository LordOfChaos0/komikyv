import nodemailer from "nodemailer";

// ============================================================
// Mailer — отправка email через Yandex SMTP
// ============================================================
// Для работы на вашей ВМ:
// 1. Включите SMTP в настройках Yandex почты:
//    https://mail.yandex.ru/?lng=ru#setup/client
// 2. Используйте пароль приложения (если включена 2FA)
// 3. Заполните .env:
//    SMTP_HOST=smtp.yandex.ru
//    SMTP_PORT=465
//    SMTP_USER=your-email@yandex.ru
//    SMTP_PASS=your-app-password
//    SMTP_FROM="Коми кыв <your-email@yandex.ru>"

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || (user ? `Коми кыв <${user}>` : null);

  if (!host || !user || !pass) {
    return null; // SMTP not configured
  }
  return { host, port, user, pass, from: from || `Коми кыв <${user}>` };
}

export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null;
}

export async function sendVerificationEmail(
  toEmail: string,
  code: string,
  userName?: string | null
): Promise<{ sent: boolean; error?: string; devCode?: string }> {
  const config = getSmtpConfig();

  if (!config) {
    // SMTP не настроен — возвращаем код для dev-режима
    console.log(`📧 [DEV MODE] Verification code for ${toEmail}: ${code}`);
    return { sent: false, devCode: code };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2d6a4f, #74c69d); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Коми кыв</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">изучение коми языка</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0;">
          <h2 style="color: #2d6a4f; margin-top: 0;">Подтверждение email</h2>
          <p style="color: #333; font-size: 16px;">Здравствуйте${userName ? `, ${userName}` : ""}!</p>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Вы зарегистрировались на платформе «Коми кыв». Для завершения регистрации
            введите этот код подтверждения:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: #2d6a4f; color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 12px;">
              ${code}
            </div>
          </div>
          <p style="color: #777; font-size: 13px;">
            Код действителен в течение 15 минут.<br>
            Если вы не регистрировались на платформе, просто проигнорируйте это письмо.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Коми кыв — Платформа изучения коми языка
          </p>
        </div>
      </div>
    `;

    const text = `Коми кыв — подтверждение email

Здравствуйте${userName ? `, ${userName}` : ""}!

Ваш код подтверждения: ${code}

Код действителен в течение 15 минут.
Если вы не регистрировались, проигнорируйте это письмо.

© ${new Date().getFullYear()} Коми кыв`;

    await transporter.sendMail({
      from: config.from,
      to: toEmail,
      subject: "Коми кыв — код подтверждения email",
      text,
      html,
    });

    return { sent: true };
  } catch (e: any) {
    console.error("Email send error:", e?.message || e);
    return { sent: false, error: e?.message || "Не удалось отправить письмо", devCode: code };
  }
}

// Generate 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
