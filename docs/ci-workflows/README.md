# CI/CD Workflows

Файлы `ci.yml` и `deploy.yml` готовы к активации. Токен, использованный
для первоначального пуша, не имел scope `workflow`, поэтому GitHub
запретил загрузку файлов в `.github/workflows/` напрямую.

## Активация (1 минута, один раз)

```bash
# С вашей машины после clone:
mkdir -p .github/workflows
cp docs/ci-workflows/*.yml .github/workflows/
git add .github && git commit -m "Активированы CI/CD workflows"
git push origin main
```

Или скачайте репозиторий, создайте файлы вручную через веб-интерфейс
GitHub (Add file → Create new file → `.github/workflows/ci.yml`) —
веб-интерфейс не требует workflow scope.

После этого CI будет запускаться на каждый push/PR, а deploy — при
заданных secrets (см. DEPLOY.md раздел 8.2).
