# 0054 Admin Nested Content Forms

## Цель

Снизить ручное редактирование JSON в разделе Content: вынести вложенные части сущностей в формы и сделать блок создания новой версии компактнее.

## Сделано

- Блок `Новая версия` в админке стал компактным раскрывающимся действием в левой колонке.
- В entity-редактор добавлены вкладки `Блоки` и `Сундуки`, чтобы редактировать `rewardTable` без ручного JSON.
- Backend entity-save расширен на `blockType` и `rewardChestType`.
- Для гоблинов стоимость найма стала списком строк, а не одним полем.
- Для типов шахт стоимость строительства стала списком строк, без ограничения на две позиции.
- Для рудников добавлены формы слоев `strata`: диапазон рядов и веса блоков по каждому типу блока.
- Для рудников добавлены формы `guaranteedObjects`: жила или сундук, диапазон рядов, количество и связанный блок.
- Для блоков добавлены поля HP, tags, visual assets, special behavior и reward table.
- Для сундуков добавлены поля tier, asset и reward table.
- Все новые вложенные формы проходят локальную валидацию до сохранения draft, а затем серверную валидацию через backend.

## Проверки

- `pnpm --filter @goblin-cartel/admin typecheck`
- `pnpm --filter @goblin-cartel/backend typecheck`
- `pnpm --filter @goblin-cartel/backend test -- content`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`

`pnpm build` прошел с прежним предупреждением Vite о крупном чанке игрового клиента.

## Открытые вопросы

- Ручной JSON-редактор пока остается как advanced mode.
- Следующий шаг: добавить создание новых блоков и сундуков через шаблоны, а не только редактирование существующих.
