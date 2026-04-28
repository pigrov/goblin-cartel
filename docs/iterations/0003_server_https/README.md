# 0003 server https

**Дата:** 2026-04-28
**Статус:** выполнено

## Цель

Выпустить TLS-сертификат для `goblin-cartel.murph.ru`, переключить общий `transcribe_nginx` на HTTPS и проверить production URL.

## Входной контекст

- Домен `goblin-cartel.murph.ru` уже указывает на `94.26.248.8`.
- Приложение поднято на сервере в `/srv/goblin-cartel/current`.
- Контейнеры backend, game-client и admin подключены к общей Docker-сети `web`.
- HTTP health-check `http://goblin-cartel.murph.ru/api/health` проходил до выпуска сертификата.

## Решения

1. Использовать существующий `certbot` из `/srv/transcribe-infra`.
2. Оставить отдельный HTTP-конфиг `deploy/nginx-goblin-cartel.http.conf` как bootstrap-вариант.
3. Для текущего production deploy использовать `deploy/nginx-goblin-cartel.https.conf`.
4. В deploy workflow проверять health endpoint по HTTPS.

## Сделано

- Выпущен Let's Encrypt сертификат для `goblin-cartel.murph.ru`.
- Сертификат сохранен в `/etc/letsencrypt/live/goblin-cartel.murph.ru/fullchain.pem`.
- Ключ сохранен в `/etc/letsencrypt/live/goblin-cartel.murph.ru/privkey.pem`.
- Срок действия сертификата: до 2026-07-27.
- Добавлен HTTPS nginx-конфиг `deploy/nginx-goblin-cartel.https.conf`.
- Nginx на сервере переключен на HTTPS-конфиг.
- HTTP настроен на редирект в HTTPS.
- Проверено автообновление: crontab пользователя `deploy` запускает `certbot renew` и reload Nginx.
- `.github/workflows/deploy.yml` переключен на HTTPS-конфиг и HTTPS health-check.
- Упаковка релиза в deploy workflow переведена на `git archive`, чтобы архив создавался только из отслеживаемых файлов репозитория.
- `docs/11_ci_cd_server.md` обновлен по фактическому состоянию.

## Проверки

Сервер:

```text
docker exec transcribe_nginx nginx -t
curl -I http://goblin-cartel.murph.ru/
curl -I https://goblin-cartel.murph.ru/
curl https://goblin-cartel.murph.ru/api/health
curl -I https://goblin-cartel.murph.ru/admin/
```

Результат:

- `https://goblin-cartel.murph.ru/` возвращает `200`.
- `https://goblin-cartel.murph.ru/admin/` возвращает `200`.
- `https://goblin-cartel.murph.ru/api/health` возвращает `200`.
- `http://goblin-cartel.murph.ru/` возвращает `301` на HTTPS.
- Nginx config test проходит.

Локально:

```text
pnpm encoding:check
```

## Открытые вопросы

1. Проверить первый автоматический deploy из GitHub Actions после настройки secrets.
