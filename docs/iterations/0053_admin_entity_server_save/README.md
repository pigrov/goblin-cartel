# 0053 Admin Entity Server Save

## Цель

Сделать формы сущностей в админке не только редактором локального JSON, а полноценным draft-инструментом: выбранный гоблин, рудник или тип шахты должен сохраняться через backend, проходить серверную проверку и попадать в content draft.

## Сделано

- Добавлен backend endpoint `PUT /api/admin/content/versions/:id/entities/:entityType/:entityId`.
- Сервис контента теперь умеет сохранять одну редактируемую сущность: `goblin`, `mineTemplate`, `builtMineType`.
- Перед записью backend собирает полный content bundle, проверяет Zod-схему и доменную `validateContentBundle`.
- При успешном сохранении версия возвращается в статус `draft`, обновляется `updatedAt`, пишется audit log `admin.content.entity.update`.
- Админские entity-формы теперь отправляют изменения на backend напрямую и обновляют JSON из ответа сервера.
- Ошибки серверной валидации из entity-save показываются в общем блоке ошибок контента.
- Быстрые шаблоны сущностей по-прежнему могут подготовить объект в JSON; после выбора его можно сохранить через entity-форму.

## Проверки

- `pnpm --filter @goblin-cartel/backend test -- content`
- `pnpm --filter @goblin-cartel/backend typecheck`
- `pnpm --filter @goblin-cartel/admin typecheck`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend db:check`
- `git diff --check`

`pnpm build` прошел с прежним предупреждением Vite о крупном чанке игрового клиента.

## Открытые вопросы

- Следующий шаг для админки: отдельные формы для strata, guaranteed objects, reward tables и cost rows без ограничения на две строки.
- Нужно решить, когда полностью убрать ручное редактирование JSON или оставить его как advanced mode.
