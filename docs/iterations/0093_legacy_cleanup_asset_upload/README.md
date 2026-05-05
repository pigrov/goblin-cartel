# 0093 legacy cleanup asset upload

## Цель

Дочистить оставшуюся совместимость со старыми content-версиями и исправить production-загрузку рендеров гоблинов, где nginx отклонял JSON/base64 upload до достижения backend-лимита 5 MB файла.

## Сделано

- `contentBundleSchema` больше не принимает bundle без `localization`, `goblinGeneration`, `goblinHut` и `elevator`.
- Валидация требует `localization.ru`; отсутствие RU-словаря больше не считается допустимым legacy-сценарием.
- Backend больше не подставляет `starterContentBundle.goblinGeneration` и `starterContentBundle.elevator`, если singleton-сущности отсутствуют в content entities.
- Game client больше не берет `starterContentBundle.elevator` как runtime fallback.
- Nginx production-конфиги получили `client_max_body_size 10m`.
- Backend Fastify получил `bodyLimit 10 MB`, чтобы JSON/base64 payload для файла до 5 MB проходил до route-валидации.

## Проверки

- `pnpm typecheck` - пройдено.
- `pnpm test` - пройдено.
- `pnpm lint` - пройдено.
- `pnpm build` - пройдено.
- `pnpm encoding:check` - пройдено.
- `pnpm --filter @goblin-cartel/backend db:check` - пройдено.
