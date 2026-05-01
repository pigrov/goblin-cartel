# 0072 Content Driven Boss Cards

## Цель

Вынести баланс карт босса из кода в content/admin и привести экран карт к компактной сетке 3 карточки в ряд, как на экране гоблинов.

## Сделано

- Добавлена сущность `bossCards` в `ContentBundle`.
- В content-схему добавлена валидация карт босса: локализация, ресурс-копия карты, ресурс эликсира, эффект, уровни и стоимость.
- В starter content перенесены 4 текущие карты босса:
  - `hit_damage`;
  - `crit_chance`;
  - `crit_multiplier`;
  - `max_energy`.
- Backend теперь хранит и редактирует `bossCard` через общий content entity save path.
- Backend подставляет starter-карты при чтении legacy content rows без `bossCard`, чтобы старая опубликованная версия сразу была видна в админке и public content API.
- В админке добавлена вкладка `Карты босса`, форма редактирования и шаблон создания новой карты.
- Game client больше не использует только hardcoded карты: определения берутся из опубликованного контента.
- Старые опубликованные версии без `bossCards` получают runtime backfill, чтобы текущий production content не ломал экран карт.
- Сохранение прогресса карт нормализуется через активные content-driven определения, поэтому новые id карт не теряются при сохранении шахты/ростера.
- Модалка карт босса перестроена в сетку 3 карточки в ряд.

## Проверки

Выполнены:

- `pnpm --filter @goblin-cartel/content-schemas test`
- `pnpm --filter @goblin-cartel/game-core test -- boss-cards.test.ts`
- `pnpm --filter @goblin-cartel/game-client test -- runtimeContent.test.ts playerSave.test.ts`
- `pnpm --filter @goblin-cartel/admin test -- adminContentTools.test.ts`
- `pnpm --filter @goblin-cartel/backend test -- content.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `git diff --check`

## Дальше

- Добавить отдельные ассеты карт вместо общей иконки `Sparkles`.
- Вынести шанс выпадения эликсира и карт по сундукам в более удобный баланс-экран, если reward table станет слишком длинной для ручного редактирования.
- Продолжить механику коллекции карт: редкости, события, новые карты и отдельный экран Босс/Карты при росте количества карт.
