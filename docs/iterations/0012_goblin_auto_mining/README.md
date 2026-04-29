# 0012 goblin auto mining

**Дата:** 2026-04-29
**Статус:** задеплоено

## Цель

Сделать гоблинов самостоятельными добытчиками: они должны бить активный блок без тапов, продолжать работу офлайн и при возврате игрока показывать понятный результат добычи.

## Входной контекст

- По ТЗ гоблины долбят блоки сами, а игрок только помогает ударами босса.
- В `0011_goblin_roster` гоблины уже влияют на силу ручного удара, но не работают по таймеру.
- Mining save хранится локально в браузере.
- До появления бригадира клиент уже автоматически выбирает следующий доступный блок после разрушения; отдельное правило бригадира будет выделено позже.

## Решения

1. Добавить авто-добычу в `game-core`, чтобы правила были тестируемыми.
2. В live-режиме применять урон гоблинов раз в секунду.
3. В offline-режиме считать накопленный урон по времени с момента последнего сохранения.
4. Чтобы возврат не выглядел как мгновенно пустая сетка, последний offline-разрушаемый блок оставлять на `1 HP` и добивать коротким финальным ударом после загрузки.
5. Удар босса отделить от урона гоблинов: гоблины дают DPS, босс дает ручной ускоряющий удар.

## Сделано

- В `game-core` добавлен `calculateCrewAutoDamagePerSecond`.
- `calculateCrewHitDamage` теперь может возвращать `0`, если нет базового урона и нанятых гоблинов.
- В `mining-session` добавлен `applyAutoMining`.
- `applyAutoMining` умеет проходить несколько блоков, собирать награды и возвращать следующий активный блок.
- Для offline-режима `applyAutoMining` умеет удерживать последний разрушенный блок на `1 HP` через `holdLastDestroy`.
- Добавлены unit tests для авто-добычи, offline hold-final-hit и DPS гоблинов.
- Game-client применяет авто-урон гоблинов раз в секунду.
- Mine save теперь хранит `activeCell` и `savedAt`.
- При загрузке игры offline progress считается по времени с последнего сохранения.
- Если offline progress разрушил блоки, клиент показывает summary и добивает последний pending-блок финальным ударом после короткой задержки.
- Удар босса отделен от урона гоблинов: кнопка бьет фиксированным boss damage, а гоблины показываются как DPS.
- В UI добавлен блок offline report и строка `Гоблины X/сек`.
- Коммит `f3fd7b9` задеплоен через GitHub Actions.
- На production опубликован content `0.0.3`, API возвращает 8 гоблинов.

## Измененные файлы

- `packages/game-core/src/goblin-roster.ts`
- `packages/game-core/src/goblin-roster.test.ts`
- `packages/game-core/src/mining-session.ts`
- `packages/game-core/src/mining-session.test.ts`
- `apps/game-client/src/ui/App.tsx`
- `apps/game-client/src/styles.css`
- `docs/iterations/README.md`
- `docs/iterations/0012_goblin_auto_mining/README.md`

## Проверки

Запущено:

```text
pnpm --filter @goblin-cartel/game-core test
pnpm --filter @goblin-cartel/game-core typecheck
pnpm --filter @goblin-cartel/game-client typecheck
pnpm lint
pnpm test
pnpm typecheck
pnpm encoding:check
pnpm --filter @goblin-cartel/backend db:check
pnpm build
git diff --check
```

Результат: пройдено.

## UTF-8 и текст

`pnpm encoding:check` пройден.

## CI/CD и миграции

Новая миграция не планируется: offline progress считается из локального save.

CI/CD:

```text
GitHub Actions CI: success
GitHub Actions deploy: success
```

Production smoke:

```text
https://goblin-cartel.murph.ru/ -> 200
https://goblin-cartel.murph.ru/admin/ -> 200
https://goblin-cartel.murph.ru/api/health -> 200
https://goblin-cartel.murph.ru/api/content/current -> 200
current content version: 0.0.3
current content goblins: 8
server containers: up
```

## Открытые вопросы

- Позже нужно выделить бригадира как условие авто-перехода к следующему блоку.
- Энергия босса и лимит ручных ударов остаются отдельной итерацией.
