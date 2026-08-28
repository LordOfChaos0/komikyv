# Развёртывание «Коми кыв» на виртуальной машине

Пошаговое руководство для тестового запуска платформы на чистой VM
(Ubuntu Server 22.04/24.04) и последующего перевода в production.

---

## 1. Требования к VM

| Параметр | Минимум для теста | Рекомендуется |
|----------|-------------------|---------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1.5 ГБ (build не влезет — собирайте локально или со swap) | 2–4 ГБ |
| Диск | 10 ГБ | 20 ГБ |
| ОС | Ubuntu 22.04 / 24.04 LTS | то же |
| Доступ | SSH | SSH + открытые 80/443 |

> **Важно про память:** `next build` потребляет ~2 ГБ RAM. На VM с 1.5 ГБ
> создайте swap (раздел 5.3) или собирайте проект на своей машине и
> переносите `.next/standalone` + `.next/static`.

### Порты
- `22` — SSH
- `80`, `443` — HTTP/HTTPS (Caddy)
- `3000` — приложение (НЕ открывать наружу, Caddy проксирует сам)

---

## 2. Быстрый старт (тест за ~10 минут)

Зайдите на VM по SSH и выполните:

```bash
# 1) Обновление системы
sudo apt update && sudo apt upgrade -y

# 2) Установка Bun (менеджер пакетов и рантайм)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version   # должен показать 1.x

# 3) Установка git
sudo apt install -y git

# 4) Клонирование проекта
#    (после публикации репозитория — см. раздел 8)
git clone https://github.com/<ВАШ_ЛОГИН>/komikyv.git
cd komikyv

# 5) Настройка окружения
cp .env.example .env
nano .env        # заполните значения — см. раздел 3

# 6) Установка зависимостей и генерация Prisma-клиента
bun install
bunx prisma generate

# 7) Сборка
bun run build

# 8) Запуск (тестовый режим, порт 3000)
cd .next/standalone
cp -r ../../.next/static .next/
cp -r ../../public .
node server.js
```

Откройте в браузере `http://<IP-VM>:3000` — если порт 3000 закрыт файрволом
(и это правильно!), временно откройте его:

```bash
sudo ufw allow 3000/tcp   # только для теста, потом закрыть
```

---

## 3. Конфигурация `.env`

```bash
cp .env.example .env
```

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `DATABASE_URL` | да | `file:/var/www/komikyv/db/custom.db` (абсолютный путь!) |
| `JWT_SECRET` | **да в production** | `openssl rand -hex 32` — без неё приложение не стартует |
| `ADMIN_ACCESS_TOKEN` | нет | Доп. токен для /api/admin/* (`openssl rand -hex 16`) |
| `ALLOWED_ORIGINS` | нет | Кросс-доменные origin через запятую (для API-доступа извне) |
| `SMTP_HOST/PORT/USER/PASS/FROM` | нет | Яндекс SMTP: восстановление пароля и подтверждение email |
| `YANDEX_CLIENT_ID/SECRET` | нет | OAuth-вход через Яндекс ID |
| `APP_URL` | нет | `https://комикыв.рф` — для OAuth redirect URI (в punycode: https://xn--b1alfbil8g.xn--p1ai) |

Минимальный `.env` для теста:

```env
DATABASE_URL=file:/home/user/komikyv/db/custom.db
JWT_SECRET=<результат openssl rand -hex 32>
```

SMTP и OAuth можно не настраивать — восстановление пароля в dev-режиме
выведет код в консоль сервера (удобно для тестов).

---

## 4. Swap для VM с малым объёмом памяти

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # проверка: Swap должен показать 2.0Gi
```

---

## 5. Автозапуск через systemd (production-режим)

```bash
sudo tee /etc/systemd/system/komikyv.service > /dev/null <<'EOF'
[Unit]
Description=Komi Kyv — Next.js standalone server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/komikyv/.next/standalone
ExecStart=/usr/bin/env node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
# переменные из .env подхватываются Next.js автоматически из
# WorkingDirectory/.env — проверьте, что файл .next/standalone/.env существует

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now komikyv
sudo systemctl status komikyv   # Active: active (running)
```

Логи:

```bash
journalctl -u komikyv -f          # живой поток
journalctl -u komikyv --since today
```

---

## 6. Caddy: HTTPS и обратный прокси

Caddy автоматически получает SSL-сертификаты Let's Encrypt.

### 6.1. Установка

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### 6.2. Конфигурация

Готовый `Caddyfile` для домена **комикыв.рф** уже лежит в корне репозитория:

```bash
sudo cp ~/komikyv/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Ручной вариант (если нужно):

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
комикыв.рф {
    encode gzip zstd
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}
EOF
sudo systemctl reload caddy
```

> Кириллический домен в Caddyfile можно писать кириллицей — Caddy
> сам преобразует в punycode (`комикыв.рф` → `xn--b1alfbil8g.xn--p1ai`).

**Требования для выпуска сертификата Let's Encrypt:**

1. A-запись DNS: `комикыв.рф` → IP сервера
2. Порты 80 и 443 открыты в файрволе и свободны (никаких nginx/apache)
3. Caddy запущен от имени пользователя с правами на 80/443

Caddy автоматически получит сертификат при первом обращении
> (проверка HTTP-01). Процесс занимает ~10 секунд после
> корректной DNS-записи. Сертификаты продлеваются автоматически.

Только по IP, без домена (самоподписанный сертификат — для чистого теста):

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
:80 {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}
EOF
sudo systemctl reload caddy
```

### 6.3. Файрвол

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Приложение доступно по **`https://комикыв.рф`** (или `http://<IP>` для теста).

---

## 7. Проверка после развёртывания

| Что проверяем | Как |
|---------------|-----|
| Приложение живо | `curl -I https://комикыв.рф` → HTTP 200 |
| Security-заголовки | `curl -I https://комикыв.рф` → CSP, HSTS, X-Frame-Options |
| API-документация | Открыть `https://комикыв.рф/api-docs` — Swagger UI |
| Логин | `student@komikyv.ru` / `Student123!` |
| Админка | `admin@komikyv.ru` / `Admin123!` |
| Страница 404 | `https://комикыв.рф/абракадабра` — «Страница не найдена» |
| Rate limit | 6 неудачных логинов подряд → 429 |
| CSRF | POST без заголовка X-CSRF-Token → 403 |

> **После тестов обязательно смените пароли демо-аккаунтов**
> (раздел «Пользователи» в админ-панели) и задайте `ADMIN_ACCESS_TOKEN`.

---

## 8. Публикация на GitHub и авто-деплой

### 8.1. Пуш репозитория (с вашей машины)

```bash
cd komikyv
git remote add origin https://github.com/<ЛОГИН>/komikyv.git
git push -u origin main
git push -u origin develop
```

### 8.2. Автоматический деплой при пуше в main

Файл `.github/workflows/deploy.yml` уже настроен. В настройках репозитория
GitHub → Settings → Secrets and variables → Actions добавьте:

| Secret | Значение |
|--------|----------|
| `SSH_HOST` | IP или домен VM |
| `SSH_USER` | пользователь SSH (например, `ubuntu`) |
| `SSH_PRIVATE_KEY` | приватный ключ (`cat ~/.ssh/id_rsa`) |
| `SSH_PATH` | путь к проекту на VM (`/home/ubuntu/komikyv`) |

Также на VM разрешите деплой-ключу sudo без пароля для перезапуска сервиса:

```bash
sudo visudo -f /etc/sudoers.d/komikyv-deploy
# добавьте строку:
ubuntu ALL=(ALL) NOPASSWD: /bin/systemctl restart komikyv
```

Теперь каждый `git push origin main` → CI соберёт проект на VM и
перезапустит сервис. CI (линт + typecheck + build) гоняется на каждый PR.

### 8.2.1. Включение 2FA для администратора (после обновления)

1. Войдите под учётной записью администратора.
2. «Настройки» → карточка «Безопасность» → «Включить двухфакторную
   аутентификацию».
3. Отсканируйте QR-код приложением-аутентификатором (Google
   Authenticator, Яндекс.Ключ, Aegis) или введите секрет вручную.
4. Введите шестизначный код из приложения для подтверждения.

Раздел «База данных» в админ-панели требует активной 2FA-сессии: без
второго фактора редактирование записей недоступно (только чтение).

### 8.3. Обновление вручную (без CI)

```bash
cd /home/ubuntu/komikyv
git pull origin main
bun install
bunx prisma generate
bunx prisma db push        # применить изменения схемы (напр., поля 2FA в User)
bun run build
cd .next/standalone && cp -r ../../.next/static .next/ && cp -r ../../public .
sudo systemctl restart komikyv
```

> **Важно:** шаг `bunx prisma db push` обязателен при обновлении до версии
> с админ-панелью и 2FA — в таблицу `User` добавляются колонки
> `totp_secret`, `totp_enabled`, `totp_last_code`. Без этого все запросы к
> пользователям (вход, профиль) вернут ошибку `no such column`.
> `db push` не стирает данные: новые колонки добавляются с `NULL`/`false`.

---

## 9. База данных

SQLite-файл `db/custom.db` уже содержит демо-данные:
4 модуля, 8 уроков, 34 упражнения, 84 слова, 12 достижений,
3 демо-пользователя.

Сброс/перегенерация:

```bash
# Полный пересид (удалит прогресс пользователей!)
curl -X POST http://localhost:3000/api/seed
```

Бэкап (добавьте в cron):

```bash
0 3 * * * sqlite3 /home/ubuntu/komikyv/db/custom.db ".backup /backup/komikyv-$(date +\%F).db"
```

---

## 10. Частые проблемы

| Симптом | Причина | Решение |
|---------|---------|---------|
| `Killed` при `bun run build` | Не хватает RAM | Создать swap (раздел 4) |
| Приложение падает на старте с ошибкой JWT_SECRET | Не задан секрет в production | `openssl rand -hex 32` → `.env` |
| 502 Bad Gateway от Caddy | Приложение не запущено | `systemctl status komikyv` |
| Пустая БД / ошибка Prisma | Неверный путь в DATABASE_URL | Абсолютный путь: `file:/home/.../db/custom.db` |
| Письма не приходят | SMTP не настроен | Код смотрится в логах: `journalctl -u komikyv \| grep "DEV MODE"` |
| CSRF 403 на всех POST | Часы VM сбиты / куки очищены | `timedatectl set-ntp on`, обновить страницу |
| OAuth кнопка не появляется | Не заданы YANDEX_* | Заполнить `.env`, перезапустить сервис |
