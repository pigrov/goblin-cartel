# 0060 Mine Editor Cell Chests Iron

## Context

После перехода редактора рудников на `cellMap` нужно убрать оставшиеся неудобства старого редактора в ежедневной работе:

- старые content-версии в production больше не нужны и мешают выбору текущей версии;
- в визуальном редакторе нужна привязка строк к метражу и сложности;
- параметры клетки должны открываться в модалке, а не отдельным блоком под сеткой;
- HP клетки должен быть виден как итоговое значение с учетом сложности ряда, но с возможностью задать точный override;
- особая клетка должна уметь дропать reward chest типа переходного сундука, а не старый block type `chest_wooden`;
- ресурсные названия надо привести к текущему дизайну: `Медь`, `Железо`, `Золото`.

## Done

- В production БД оставлена только опубликованная content-версия `0.0.7`.
- Старые content-версии `0.0.1`-`0.0.6` удалены вместе со 105 связанными `content_entities`.
- В `MineCell` добавлены поля:
  - `hp` для точного HP клетки;
  - `rewardChestTypeId` для сундука, который открывается после разрушения клетки;
  - `special: "reward_chest"`.
- `game-core` теперь переносит `hp` и `rewardChestTypeId` из `cellMap` в сессию добычи.
- Game client открывает reward chest screen после разрушения клетки с `special: "reward_chest"`.
- Экран сундука теперь различает сундук за переход в новый рудник и сундук, найденный внутри рудника.
- В admin visual mine editor:
  - слева от строк показывается метраж;
  - справа показывается сложность строки;
  - двойной клик открывает модалку параметров клетки;
  - модалка показывает итоговое HP и авто-HP по сложности;
  - можно задать точное HP;
  - можно выбрать `Дроп сундука` и конкретный reward chest type.
- В starter content добавлен ресурс `iron`, блок `iron_ore`, жила `iron_vein_small` и тип постоянной железной шахты.
- Названия обновлены:
  - `Медная руда` -> `Медь`;
  - block `chest_wooden` -> `Золото`;
  - добавлено `Железо`.
- Runtime content дополняет старые опубликованные версии новым starter resource/block/localization минимумом, чтобы текущая production-версия не показывала устаревшие названия в игре.

## Tests

- `pnpm --filter @goblin-cartel/content-schemas test`
- `pnpm --filter @goblin-cartel/game-core test`
- `pnpm --filter @goblin-cartel/admin test`
- `pnpm --filter @goblin-cartel/game-client test`
- `pnpm --filter @goblin-cartel/content-schemas typecheck`
- `pnpm --filter @goblin-cartel/game-core typecheck`
- `pnpm --filter @goblin-cartel/admin typecheck`
- `pnpm --filter @goblin-cartel/game-client typecheck`

## Notes

- Legacy `strata`, `seedMode`, `guaranteedObjects` и raw JSON еще не удалялись в этой итерации. Это следующий шаг чистки старого редактора.
- Offline-разрушение reward-chest клеток пока не выделено в отдельный список найденных сундуков. Сейчас онлайн-разрушение открывает экран сундука сразу.
