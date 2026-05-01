# 0071 Boss Cards Elixir Pixi Stable

## Цель

Добавить первую версию карточной прокачки босса и одновременно исправить production crash игрового экрана `ViewContainer.mjs: Class extends value undefined`.

## Сделано

- Pixi больше не дробится на несколько `pixi-vendor` chunks: сцена остается lazy-loaded, но сам Pixi собирается одним стабильным chunk.
- Для production-сборки поднят `chunkSizeWarningLimit`, потому что большой Pixi chunk теперь осознанно отдельный и лениво загружаемый.
- Добавлен ресурс `Эликсир`.
- Добавлены скрытые ресурсы-копии карт:
  - `Карта силы удара`;
  - `Карта критического шанса`;
  - `Золотая карта крита`;
  - `Карта запаса энергии`.
- Эликсир добавлен в reward table всех блоков с небольшим шансом выпадения.
- Карты и Эликсир добавлены в reward table сундуков.
- Старый опубликованный content получает Эликсир, карты, локализацию и дропы через runtime backfill, поэтому механика работает без ручного пересоздания текущей версии контента.
- В `game-core` добавлена механика карточек босса:
  - прогрессивная стоимость карт `2, 5, 10, 20, 50...`;
  - стоимость в Эликсире по редкости;
  - апгрейд карты со списанием ресурсов;
  - применение бонусов к `BossEnergyConfig`.
- Прогресс карт сохраняется в общий player save.
- Рядом с блоком энергии босса добавлена кнопка `Карты`.
- Добавлена модалка карт босса с прогрессом `имеется/нужно`, стоимостью в Эликсире и кнопкой улучшения.

## Проверки

Выполнены:

- `pnpm --filter @goblin-cartel/game-core test -- boss-cards.test.ts`
- `pnpm --filter @goblin-cartel/content-schemas test`
- `pnpm --filter @goblin-cartel/game-client test -- playerSave.test.ts runtimeContent.test.ts`
- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/game-core typecheck`
- `pnpm --filter @goblin-cartel/game-client build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `git diff --check`

## Дальше

- Вынести баланс карт босса в content/admin, когда станет понятно, какие редкости и типы карт оставляем.
- Добавить отдельные ассеты карт вместо CSS-иконок.
- Добавить визуальный экран коллекции карт, если кнопки рядом с энергией станет мало.
