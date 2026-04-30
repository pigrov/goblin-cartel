# 0057 Mine Cell Map Paint Editor

## Цель

Упростить настройку рудников в админке: вместо слоев, seed mode и гарантированных объектов сделать прямую карту клеток, которую можно рисовать кистью. Базовые поля рудника должны остаться понятными: название, ширина, высота, глубина, сложность от/до, жила после расчистки и сундук перехода.

## Сделано

- В content schema добавлен `cellMap` для рудника: каждая клетка хранит `row`, `col`, `blockTypeId`, опциональный множитель HP и будущие специальные параметры.
- Стартовые рудники переведены с `strata` на явные 8x10 карты клеток.
- Генератор шахты теперь умеет читать `cellMap`; старый путь через `strata` оставлен как legacy fallback.
- HP блока в игровой сессии учитывает множитель клетки, а общая сложность по строкам интерполируется от `difficultyStart` до `difficultyEnd`.
- Runtime test mine теперь обрезает/пересобирает `cellMap` под тестовую глубину 10 м.
- В админке форма рудника убрала `Seed mode`, `Слои рудника` и `Гарантированные объекты`.
- Визуальный редактор рудника стал paint-grid редактором: выбор камня кистью, рисование зажатой кнопкой мыши, двойной клик по клетке для параметров.
- Создание нового рудника теперь делает чистую карту клеток по размеру шаблона, а не копирует старые слои генерации.
- Unit-тесты обновлены под cell-map helpers, валидацию схемы, генератор шахты и runtime resize.

## Проверки

- `pnpm --filter @goblin-cartel/admin test`
- `pnpm --filter @goblin-cartel/content-schemas test`
- `pnpm --filter @goblin-cartel/game-core test`
- `pnpm --filter @goblin-cartel/game-client test`
- `pnpm --filter @goblin-cartel/admin typecheck`
- `pnpm --filter @goblin-cartel/content-schemas typecheck`
- `pnpm --filter @goblin-cartel/game-core typecheck`
- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`

`pnpm build` прошел с прежним предупреждением Vite о крупном чанке игрового клиента.

## Открытые вопросы

- Параметры дропа конкретной клетки пока не сохраняются: в модели оставлен путь для расширения через параметры клетки, но игровой дроп все еще идет из `blockTypes.rewardTable`.
- Текущий paint-grid рассчитан на простую ручную раскраску. Следующий шаг - добавить удобные шаблоны заполнения рядов и массовую замену типа камня без возврата к слоям.
