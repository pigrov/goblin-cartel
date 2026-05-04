# 0088 android_cors_fix

## Цель

Исправить загрузку production API из Android/Capacitor WebView: установленный debug APK показывал `Failed to fetch` на месте рудника, хотя web-версия на домене работала.

## Причина

В production backend CORS разрешал только `BASE_URL`, то есть `https://goblin-cartel.murph.ru`. В Android/Capacitor origin приложения отличается от домена сайта и в текущей конфигурации приходит как `https://localhost`. Из-за этого браузер внутри WebView блокировал запросы к `https://goblin-cartel.murph.ru/api/...`, а клиент показывал сетевую ошибку.

## Сделано

- Backend production CORS теперь разрешает:
  - `BASE_URL`;
  - `https://localhost` для Android Capacitor с `androidScheme: "https"`;
  - `capacitor://localhost` и `ionic://localhost` как совместимые native-wrapper origins.
- Добавлен unit test на список production CORS origins.

## Проверки

- `pnpm --filter @goblin-cartel/backend test`
- `pnpm --filter @goblin-cartel/backend typecheck`
- `pnpm lint`
- `pnpm encoding:check`
- `git diff --check`

## Дальше

После деплоя проверить `Access-Control-Allow-Origin` для `Origin: https://localhost` на `GET /api/content/current`.
