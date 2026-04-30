# Итерация 0040: resource display hook и ровный счетчик энергии

## Цель

Убрать UX-тайминг ресурсов из `App.tsx`, покрыть его unit-тестами и поправить счетчик энергии босса: восстановление должно идти целыми единицами с постоянной скоростью, а расход при ударе должен применяться сразу.

## Сделано

- Добавлен `useDelayedResourceDisplay.ts`.
- Логика отложенного начисления видимых ресурсов, сброса pending timers и flash конкретных resource chips вынесена из `App.tsx`.
- Для тестов выделен `createDelayedResourceDisplayController`, который не зависит от React render loop.
- Добавлены unit-тесты на отложенное начисление, отмену pending rewards при sync и игнорирование non-positive rewards.
- Убран `useSteppedIntegerValue`: энергия больше не делает плавный обратный отсчет вниз.
- `bossEnergyTickMs` теперь рассчитывается от `bossEnergyConfig.regenPerSecond`, поэтому восстановление UI-счетчика идет ровными целыми шагами.

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

## Открытые вопросы

- Нет.
