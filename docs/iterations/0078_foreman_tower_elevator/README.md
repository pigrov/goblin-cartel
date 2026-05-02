# 0078 foreman tower elevator

## Цель

Довести рудник до следующего игрового слоя перед production-деплоем: бригадиры должны управлять офлайн-перестановками, а подъемник должен стать прокачиваемой частью базы и ограничивать размер рабочей платформы.

## Входной контекст

- Рудник уже переведен на PixiJS, есть ручное перетаскивание гоблинов по колонкам и офлайн-добыча.
- В игре появились роли гоблинов: шахтеры, сборщики и бригадиры.
- Пользователь хочет видеть отдельную вышку бригадиров на руднике и развивать подъемник как отдельную постройку базы.
- На этом этапе версионные fallback для старого прогресса не развиваются: новая content version по-прежнему может сбрасывать локальный прогресс.

## Решения

- Бригадиры остаются обычными покупаемыми гоблинами роли `foreman`; назначение на рудник происходит через отдельную вышку с тремя слотами.
- Только назначенные в вышку бригадиры участвуют в офлайн-перестановках, офлайн-уроне и офлайн-бонусе добычи.
- Подъемник вынесен в отдельное клиентское состояние с 5 уровнями. Уровень сохраняется в player save и задает лимит гоблинов на платформе: 2, 3, 4, 5, 7.
- Подъемник пока не вынесен в админку/content: это осознанное v1-решение, чтобы быстро проверить механику в игре. Следующий шаг - сделать баланс подъемника content-driven.
- Pixi-сцена получает только готовые view props: уровень подъемника, гоблины, бригадиры и ключи посадочных мест.

## Сделано

- Добавлена вышка бригадиров на поверхности рудника: кнопка, модалка назначения, 3 слота и визуализация назначенных бригадиров в Pixi.
- Добавлены эффекты бригадира:
  - `offline_relocation_slots`;
  - `offline_auto_damage_multiplier`;
  - `offline_reward_multiplier`.
- Офлайн-добыча теперь учитывает только бригадиров, назначенных в вышку.
- У гоблинов на платформе появились статусы: работает, ждет, готов.
- Добавлен `elevatorState` с уровнями, стоимостью улучшения, лимитом мест и unit-тестами.
- Уровень подъемника сохраняется вместе с рудником.
- Посадка гоблинов ограничена уровнем подъемника, но гоблина можно ставить в любую колонку платформы, включая пустые места.
- На экране базы добавлена карточка подъемника с текущим уровнем, числом мест, стоимостью и кнопкой улучшения.
- В Pixi-механизме подъемника добавлен визуальный уровень `LV`.

## Измененные файлы

- `apps/game-client/src/ui/elevatorState.ts`
- `apps/game-client/src/ui/elevatorState.test.ts`
- `apps/game-client/src/ui/foremanTowerState.ts`
- `apps/game-client/src/ui/foremanTowerState.test.ts`
- `apps/game-client/src/ui/useGoblinPlacement.ts`
- `apps/game-client/src/ui/useGoblinPlacement.test.ts`
- `apps/game-client/src/ui/useGameBootstrap.ts`
- `apps/game-client/src/ui/useGameController.ts`
- `apps/game-client/src/ui/useGamePersistence.ts`
- `apps/game-client/src/ui/useMineProgressionController.ts`
- `apps/game-client/src/ui/screens/GameMainContent.tsx`
- `apps/game-client/src/ui/screens/GoblinManagementScreens.tsx`
- `apps/game-client/src/ui/screens/MineScreen.tsx`
- `apps/game-client/src/ui/MinePixiScene.tsx`
- `apps/game-client/src/ui/minePixiRenderPasses.ts`
- `apps/game-client/src/ui/minePixiSurface.ts`
- `apps/game-client/src/ui/minePixiPlatform.ts`
- `apps/game-client/src/styles.css`
- `packages/content-schemas/src/index.ts`
- `packages/game-core/src/goblin-roster.ts`

## Проверки

- `pnpm --filter @goblin-cartel/game-client typecheck` - passed.
- `pnpm --filter @goblin-cartel/game-client test -- elevatorState.test.ts useGoblinPlacement.test.ts playerSave.test.ts` - passed.
- `pnpm --filter @goblin-cartel/game-client test` - passed, 16 files / 69 tests.
- `pnpm --filter @goblin-cartel/game-client build` - passed.
- `pnpm typecheck` - passed.
- `pnpm test` - passed.
- `pnpm lint` - passed.
- `pnpm build` - passed.
- `pnpm encoding:check` - passed.

## UTF-8 и текст

- Новые русские строки добавлены в UTF-8.
- Проверка `pnpm encoding:check` прошла после добавления документации и клиентских изменений.

## CI/CD и миграции

- Миграций БД в этой итерации нет.
- После полного локального чека изменения отправляются в `main`; production deploy проходит через существующий GitHub Actions workflow на сервер `selectel-transcribe`.

## Открытые вопросы

- Вынести баланс подъемника в content/admin, чтобы стоимость и лимит мест менялись без релиза клиента.
- Добавить подъемнику следующие параметры: скорость спуска, офлайн-лимит часов, бонус к перевозке ресурсов.
- Решить, должен ли сброс текущего рудника сбрасывать уровень подъемника или это постоянная постройка базы.
