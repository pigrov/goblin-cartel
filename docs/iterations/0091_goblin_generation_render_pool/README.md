# 0091 goblin generation render pool

## Цель

Перенести загрузку визуальных рендеров из технических шаблонов гоблинов в генерацию случайного найма. У игрока теперь должен появляться конкретный сгенерированный гоблин со своим стабильным `assetId`.

## Сделано

- В `goblinGeneration.archetypes[]` добавлен `renderPool`: строки `assetId`, `weight`, опциональная `rarity`.
- `rollGoblinInstance` выбирает рендер после редкости и сохраняет `assetId` в `GoblinRosterInstance`.
- Клиент при построении runtime-гоблина использует `instance.assetId`; после `0092` шаблонного asset fallback больше нет.
- В reveal-модалке найма показывается именно рендер нового instance.
- В админке вкладка `Гоблины` переименована в `Шаблоны`.
- Загрузка рендера убрана из формы шаблонного гоблина и добавлена в `Генерация -> Пул рендеров` для каждого контракта.
- Starter content получил базовые render pools для шахтера, сборщика и бригадира.

## Проверки

- `pnpm --filter @goblin-cartel/content-schemas test` - пройдено.
- `pnpm --filter @goblin-cartel/game-core test -- goblin-roster` - пройдено.
- `pnpm --filter @goblin-cartel/admin typecheck` - пройдено.
- `pnpm --filter @goblin-cartel/game-client typecheck` - пройдено после правки тестового archetype.

## Открытые вопросы

- Закрыто в `0092_goblin_generation_template_cleanup`: генерация теперь хранит ability, leveling, специализацию и обязательный render pool, а шаблонные гоблины удалены из content/runtime.
