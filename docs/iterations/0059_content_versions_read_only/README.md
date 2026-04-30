# 0059 Content Versions Read Only

## Цель

Сделать прошлые версии контента честно read-only: опубликованные и архивные версии можно открывать для просмотра, но нельзя сохранять, валидировать или публиковать повторно. Это убирает ложное ощущение, что изменения в опубликованной версии попадут в игру.

## Сделано

- Backend теперь считает редактируемыми только статусы `draft` и `validated`.
- `validateVersion` возвращает `version_not_editable` для `published` и `archived`.
- `publishVersion` возвращает `version_not_editable` для `published` и `archived`.
- API routes для `validate` и `publish` отдают `409`, если версия уже read-only.
- В админке кнопки `Save`, `Validate`, `Publish`, шаблоны и формы сущностей доступны только для `draft`/`validated`.
- Для read-only версий в админке показывается явное сообщение: версию можно только просматривать, для изменений нужен новый draft.
- Unit-тест backend покрывает published и archived версии как read-only.

## Проверки

- `pnpm --filter @goblin-cartel/backend test`
- `pnpm --filter @goblin-cartel/backend typecheck`
- `pnpm --filter @goblin-cartel/admin typecheck`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`

`pnpm build` прошел с прежним предупреждением Vite о крупном чанке игрового клиента.

## Открытые вопросы

- Следующий UX-шаг: добавить отдельную кнопку `Создать draft из этой версии`, чтобы правки прошлой или опубликованной версии начинались с копии, а не со стартового контента.
