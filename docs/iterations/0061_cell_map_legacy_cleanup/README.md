# 0061 Cell Map Legacy Cleanup

## Цель

Убрать старую модель редактора рудника, чтобы новые рудники создавались и игрались только через явную карту клеток `cellMap`.

## Сделано

- Из content schema удалены legacy-поля рудника `seedMode`, `strata`, `guaranteedObjects` и старый `difficulty`.
- Клетки рудника больше не поддерживают `hpMultiplier`, клеточные жилы и старый special `chest`.
- `cellMap` стала обязательной моделью рудника, а `mineTemplate` и `mineCell` теперь strict-схемы.
- Game core больше не генерирует рудники из слоев и весов; генерация читает только авторскую карту клеток.
- Сложность ряда теперь передается в сессию как `difficultyMultiplier`, а точный `hp` клетки остается ручным override.
- Старый блок `chest_wooden` заменен на `gold_cache`; визуально и по локализации это блок золота, а reward chest остается отдельной сущностью.
- Runtime-клиент больше не добавляет starter-сущности и не чинит старый опубликованный контент на лету.
- В админке `hpMultiplier` убран из состояния клеток, raw JSON спрятан за отдельной кнопкой.
- Документация и sample config обновлены под `cellMap`.

## Проверки

- Targeted tests/typecheck для `content-schemas`, `game-core`, `admin`, `game-client`.

## Следующее

- После деплоя нужно опубликовать чистую версию контента, потому что production `0.0.7` еще хранит старые `chest_wooden`, `seedMode`, `strata`, `guaranteedObjects`.
