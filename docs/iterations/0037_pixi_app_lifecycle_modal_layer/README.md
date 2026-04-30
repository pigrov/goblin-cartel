# Итерация 0037: Pixi app lifecycle и слой модалок

## Цель

Упростить `MinePixiScene.tsx`: вынести создание/уничтожение Pixi `Application`, root-контейнера и scene layers в отдельный модуль. Заодно исправить видимость нижнего блока энергии босса и порядок слоев, чтобы модалки всегда были выше energy overlay.

## Сделано

- Добавлен `minePixiApp.ts`, который создает Pixi app, root-контейнер, все scene layers, настраивает touch scroll и владеет очисткой app через `destroy`.
- `MinePixiScene.tsx` теперь подключает Pixi app через React lifecycle и передает только callback кадра в общий ticker.
- Очистка Pixi-слоев вынесена в `clearMinePixiLayer`.
- Блок энергии босса сделан менее прозрачным.
- `modal-backdrop` поднят выше boss energy overlay по `z-index`, чтобы настройки и параметры босса не перекрывались нижним блоком.

## Проверки

- `pnpm --filter @goblin-cartel/game-client typecheck` - пройдено.
- `pnpm --filter @goblin-cartel/game-client test` - пройдено.
- `pnpm lint` - пройдено.
- `pnpm typecheck` - пройдено.
- `pnpm test` - пройдено.
- `pnpm build` - пройдено.
- `pnpm encoding:check` - пройдено.
- `pnpm --filter @goblin-cartel/backend db:check` - пройдено.
- `git diff --check` - пройдено.
- Локальная визуальная проверка в Chrome 390x844 - Pixi canvas рендерится после выноса lifecycle.
- CDP-проверка меню - `modal-backdrop` открывается выше boss energy overlay (`z-index: 60` против `18`).

## Открытые вопросы

- Нет.
