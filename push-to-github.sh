#!/usr/bin/env bash
# ============================================================
# Публикация проекта «Коми кыв» на GitHub
# Запускать на своей машине после клонирования/копирования
# проекта из песочницы (или прямо из песочницы, если есть токен).
#
# Использование:
#   ./push-to-github.sh <ВАШ_ЛОГИН_GITHUB> [имя-репозитория]
# Пример:
#   ./push-to-github.sh ivanov komikyv
# ============================================================
set -e

OWNER="${1:?Укажите логин GitHub: ./push-to-github.sh <логин> [repo]}"
REPO="${2:-komikyv}"
URL="https://github.com/$OWNER/$REPO.git"

echo "=== Публикация «Коми кыв» на GitHub ==="
echo "Репозиторий: $URL"
echo ""

# 1. Проверка чистоты рабочего дерева
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Есть незакоммиченные изменения:"
  git status --short
  echo "Сначала закоммитьте их: git add -A && git commit -m '...'"
  exit 1
fi

# 2. Создание репозитория на GitHub (нужен установленый gh CLI)
if command -v gh >/dev/null 2>&1; then
  echo ">>> Создаём репозиторий $OWNER/$REPO (если ещё не существует)..."
  gh repo create "$OWNER/$REPO" --private --confirm 2>/dev/null \
    || echo "    (репозиторий уже существует или создаётся вручную)"
else
  echo ">>> gh CLI не найден — создайте репозиторий вручную:"
  echo "    https://github.com/new → имя: $REPO → Private → Create"
fi

# 3. Привязка remote
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$URL"
else
  git remote add origin "$URL"
fi
echo ">>> Remote origin → $URL"

# 4. Пуш обеих веток
echo ">>> Push main..."
git push -u origin main

echo ">>> Push develop..."
git push -u origin develop

echo ""
echo "=== Готово! ==="
echo "Откройте: https://github.com/$OWNER/$REPO"
echo ""
echo "Следующие шаги:"
echo "  1) Settings → Secrets → Actions — добавьте SSH_HOST, SSH_USER,"
echo "     SSH_PRIVATE_KEY, SSH_PATH для авто-деплоя (см. DEPLOY.md раздел 8.2)"
echo "  2) Проверьте Actions — CI должен пройти на оба пуша"
