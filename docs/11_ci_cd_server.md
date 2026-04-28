# Goblin Cartel: CI/CD и сервер

**Дата:** 2026-04-28

## Целевые параметры

- Домен: `goblin-cartel.murph.ru`
- Сервер: `94.26.248.8`
- SSH alias локально: `selectel-transcribe`
- GitHub remote: `git@github.com:pigrov/goblin-cartel.git`
- Deploy path: `/srv/goblin-cartel`

## Локальные env

Локальный `.env` не коммитится. Значения `APP_CREDENTIALS_MASTER_KEY` и `APP_BOOTSTRAP_ADMIN_EMAILS` берутся из него.

Для production нужен файл `.env.production` на сервере. Через GitHub Actions env-файл не передается: workflow использует уже подготовленный файл `/srv/goblin-cartel/.env.production`.

Минимальный пример без реальных секретов:

```text
DOMAIN=goblin-cartel.murph.ru
BASE_URL=https://goblin-cartel.murph.ru
POSTGRES_DB=goblin_cartel
POSTGRES_USER=goblin_cartel
POSTGRES_PASSWORD=...
DATABASE_URL=postgres://goblin_cartel:...@postgres:5432/goblin_cartel
APP_CREDENTIALS_MASTER_KEY=...
APP_BOOTSTRAP_ADMIN_EMAILS=...
```

## GitHub secrets

Для deploy workflow нужны secrets:

```text
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
```

Имена совпадают с существующим шаблоном deploy workflow в других проектах на сервере.
Production env не передается через GitHub Actions: файл должен лежать на сервере в `/srv/goblin-cartel/.env.production`.

## Что делает CI

Workflow `.github/workflows/ci.yml`:

1. устанавливает зависимости;
2. запускает UTF-8/mojibake check;
3. запускает lint;
4. запускает typecheck;
5. запускает unit tests;
6. проверяет Drizzle migrations;
7. собирает все приложения и пакеты.

## Что делает CD

Workflow `.github/workflows/deploy.yml`:

1. повторяет quality gate;
2. собирает архив репозитория;
3. загружает архив на сервер;
4. распаковывает в `/srv/goblin-cartel/current`;
5. копирует серверный `/srv/goblin-cartel/.env.production` в текущий release;
6. запускает `docker compose --env-file .env.production -f deploy/docker-compose.prod.yml up -d --build`;
7. копирует nginx-конфиг в `/srv/transcribe-infra/nginx/conf.d/goblin-cartel.murph.ru.conf`;
8. проверяет и перезагружает общий `transcribe_nginx`;
9. backend перед стартом применяет `drizzle-kit migrate`;
10. workflow проверяет `https://goblin-cartel.murph.ru/api/health`.

## Подготовка сервера

На сервере должны быть:

- Docker Engine;
- Docker Compose plugin;
- существующая внешняя Docker-сеть `web`;
- общий nginx-контейнер `transcribe_nginx`, подключенный к сети `web`;
- открытые порты `80` и `443`;
- доступ пользователя из GitHub Actions к `/srv/goblin-cartel`.

Базовая проверка:

```sh
DEPLOY_PATH=/srv/goblin-cartel sh scripts/deploy/bootstrap-server.sh
```

## DNS

До первого production deploy запись `A` для `goblin-cartel.murph.ru` должна указывать на:

```text
94.26.248.8
```

Контейнеры можно поднять до переключения DNS, но внешний health-check проходит только после корректной `A`-записи.

## HTTPS

TLS-сертификат для `goblin-cartel.murph.ru` выпущен через существующий `certbot` в `/srv/transcribe-infra`.

- Сертификат: `/etc/letsencrypt/live/goblin-cartel.murph.ru/fullchain.pem`
- Ключ: `/etc/letsencrypt/live/goblin-cartel.murph.ru/privkey.pem`
- Истекает: 2026-07-27
- Nginx-конфиг в репозитории: `deploy/nginx-goblin-cartel.https.conf`
- Автообновление: crontab пользователя `deploy` запускает `certbot renew` и reload Nginx.

HTTP должен отвечать только редиректом на HTTPS, кроме `/.well-known/acme-challenge/`.
