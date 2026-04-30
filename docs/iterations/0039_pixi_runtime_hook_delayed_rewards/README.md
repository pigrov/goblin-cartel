# Итерация 0039: Pixi runtime hook и отложенные награды

## Цель

Сделать `MinePixiScene.tsx` еще тоньше, вынеся синхронизацию props/refs и запуск Pixi ticker в отдельный hook. Параллельно поправить UX энергии босса и начисления ресурсов: энергия должна отображаться целыми числами с пошаговым приростом, а ресурсы из камней должны попадать в шапку после окончания вылетающей анимации.

## Сделано

- Добавлен `useMinePixiSceneRuntime.ts`, который владеет Pixi refs, синхронизацией props в refs, запуском Pixi app/ticker и cleanup.
- `MinePixiScene.tsx` теперь в основном считает layout/visible range, подключает input/render passes и рендерит dev overlay.
- Энергия босса в UI отображается без дробных значений и догоняет фактическое значение шагом в 1 единицу.
- Ресурсные счетчики в шапке отделены от фактических `session.resources`: модель обновляется сразу, а видимый счетчик прибавляет награду после `destroyedHitEffectDurationMs`.
- Для ресурса, который пришел из разрушенного блока, добавлен flash на конкретном resource chip.
- Длительность destroyed Pixi effect вынесена в `destroyedHitEffectDurationMs`, чтобы UI-тайминг награды был связан с Pixi-анимацией.

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
- Локальная визуальная проверка в Chrome 390x844 - Pixi canvas, счетчик энергии и resource chips рендерятся после выноса runtime hook.

## Открытые вопросы

- Нет.
