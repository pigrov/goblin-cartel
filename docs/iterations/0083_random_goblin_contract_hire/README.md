# 0083 Random Goblin Contract Hire

## Цель

Подключить к Хижине первый рабочий цикл случайного найма: игрок покупает контракт, получает уникального гоблина с именем, редкостью и роллеными статами, видит reveal-экран и сохраняет результат в своем ростере.

## Сделано

- В `game-core` добавлен `hireRandomGoblin`: проверяет открытие роли Хижиной, лимит нанятых гоблинов, стоимость контракта и списывает ресурсы.
- Случайный гоблин сохраняется как отдельный `GoblinRosterInstance`, а `hiredGoblinIds` теперь умеет хранить и шаблонных гоблинов, и rolled instance id.
- В клиенте добавлено превью случайных контрактов в Хижине: цена, доступность, причина блокировки.
- Добавлен reveal-экран нового гоблина с именем, прозвищем, редкостью, статами и особенностями.
- В Хижине появился компактный список уже нанятых личных гоблинов.
- Сводки Хижины и лимит найма считают реальные instances, чтобы случайные гоблины сразу занимали места.
- Добавлены unit tests для core-найма, preview контрактов, учета instances и сохранения ростера.

## Проверки

- `pnpm --filter @goblin-cartel/game-core typecheck`
- `pnpm --filter @goblin-cartel/game-core test -- goblin-roster.test.ts`
- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/game-client test -- goblinHutClientState.test.ts playerSave.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm encoding:check`
- `pnpm build`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`

## Открытые вопросы

- Случайные шахтеры уже сохраняются и считаются в лимите, но следующий шаг нужен для полноценного подключения rolled stats к Pixi-размещению, урону и прокачке конкретного экземпляра.
- Нужно решить, как показывать и улучшать equipment/traits, чтобы случайные гоблины стали полноценной точкой долгосрочных вложений.
