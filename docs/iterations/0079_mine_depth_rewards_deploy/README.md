# 0079 mine depth rewards deploy

## Цель

Довести спуск платформы после очистки ряда до понятного игрового события и добавить content-driven награду за пройденные метры, чтобы баланс рудника можно было менять через админку без релиза клиента.

## Входной контекст

- Рудник уже работает на PixiJS, платформа опускается при очистке ряда.
- Подъемник уже вынесен в content/admin и влияет на количество мест, скорость спуска, офлайн-урон и визуальный уровень платформы.
- Перед production push нужно сохранить контекст итерации, прогнать полный локальный чек, включая UTF-8, и только затем отправлять `main`.

## Решения

- Награда за метры хранится в `mineTemplate.depthProgressReward`.
- В настройке рудника есть:
  - `resourceId` - ресурс награды;
  - `amountPerMeter` - базовая сумма за метр;
  - `multiplier` - множитель конкретного рудника;
  - `maxAmount` - лимит награды за одно событие спуска.
- Награда начисляется только при фактическом переходе платформы на новый ряд.
- Видимое начисление ресурсов идет через существующий delayed resource display, чтобы счетчик в шапке обновлялся после игрового эффекта.
- Экономика не завязана на Pixi: Pixi отвечает только за визуальное событие, а начисление живет в `useMiningLoop`.

## Сделано

- Добавлен `mineDepthProgressRewardSchema` в content schema.
- В starter content для 5 рудников задана начальная награда за метры:
  - первые рудники дают камень;
  - средние рудники дают медь;
  - поздний рудник дает железо.
- В админке рудника добавлены поля управления наградой за метр.
- Валидация content проверяет ссылку на существующий ресурс награды.
- При очистке ряда появляется событие `PlatformDropEvent` с глубиной, прогрессом до дна и наградой.
- В руднике добавлен тост "Ряд очищен" с `+X м`, текущей наградой и progress bar до конца рудника.
- У подъемника добавлена короткая пауза перед плавным спуском, чтобы событие лучше читалось визуально.
- Кнопка подъемника подсвечивается во время спуска.

## Измененные файлы

- `packages/content-schemas/src/index.ts`
- `packages/content-schemas/src/index.test.ts`
- `apps/admin/src/ui/App.tsx`
- `apps/admin/src/ui/adminContentTools.test.ts`
- `apps/game-client/src/ui/useMiningLoop.ts`
- `apps/game-client/src/ui/useMiningLoop.test.ts`
- `apps/game-client/src/ui/gameViewModels.ts`
- `apps/game-client/src/ui/screens/GameMainContent.tsx`
- `apps/game-client/src/ui/screens/MineScreen.tsx`
- `apps/game-client/src/ui/minePixiTicker.ts`
- `apps/game-client/src/ui/minePixiTicker.test.ts`
- `apps/game-client/src/styles.css`

## Проверки

- `pnpm --filter @goblin-cartel/content-schemas test` - passed.
- `pnpm --filter @goblin-cartel/admin test` - passed.
- `pnpm --filter @goblin-cartel/game-client test -- useMiningLoop minePixiTicker` - passed.
- `pnpm --filter @goblin-cartel/game-client typecheck` - passed.

Перед push на production дополнительно выполняется полный чек:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`

## UTF-8 и текст

- Новые русские строки добавлены в UTF-8.
- Перед релизом обязательно выполняется `pnpm encoding:check`, так как проект содержит русский UI и документацию.

## CI/CD

- Миграций БД в этой итерации нет.
- Production deploy запускается push в `main` через `.github/workflows/deploy.yml`.

## Открытые вопросы

- Решить, нужна ли отдельная статистика "заработано за глубину" в итогах рудника.
- Позже можно вынести награду за метры в отдельный набор правил, если появятся бонусы от карт, подъемника или событий.
