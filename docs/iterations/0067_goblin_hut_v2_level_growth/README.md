# 0067 Goblin Hut V2 Level Growth

## Цель

Сделать экран хижины более игровым и компактным: показывать гоблинов карточками, разделить имя и прозвище, раскрывать полные параметры по клику и перевести прокачку гоблинов на золото.

## Сделано

- В content-схему добавлен optional `nicknameKey` для гоблинов.
- Стартовые гоблины получили отдельные локализованные имя и прозвище.
- Прокачка стартовых гоблинов переведена на золото; content validation теперь запрещает не-золотые ресурсы в `goblins.*.leveling.cost`.
- Для строителей и бригадиров добавлен рост строительных бонусов от уровня:
  - `buildCostMultiplierPerLevel`;
  - `buildTimeMultiplierPerLevel`.
- `calculateGoblinEffectiveAbilityEffects` теперь усиливает `build_cost_multiplier` и `build_time_multiplier` по уровню.
- Экран `Хижина` теперь показывает гоблинов сеткой 3 карточки в ряд:
  - процедурный портрет;
  - имя;
  - прозвище;
  - иконка специализации;
  - уровень;
  - действие `Нанять`/`Улучшить`.
- По клику на карточку открывается модалка с полной информацией: описание, статы, умение, текущий эффект, стоимость и действие.
- Админская форма гоблина получила поле прозвища и поля роста строительных бонусов от уровня.

## Проверки

Пока выполнены:

- `pnpm --filter @goblin-cartel/content-schemas test`
- `pnpm --filter @goblin-cartel/game-core test -- goblin-roster.test.ts`
- `pnpm --filter @goblin-cartel/game-client test -- goblinHutClientState.test.ts builtMineClientState.test.ts`
- `pnpm --filter @goblin-cartel/admin test`
- `pnpm --filter @goblin-cartel/backend test -- content.test.ts content-routes.test.ts`
- `pnpm --filter @goblin-cartel/game-client typecheck`

## Открытые вопросы

- Портреты пока процедурные CSS-аватары. Позже их стоит заменить на настоящие ассеты гоблинов из content/admin.
- В админке прокачка гоблинов все еще отображается как настраиваемая формула; следующей итерацией можно сделать отдельную компактную форму "золото за уровень".
