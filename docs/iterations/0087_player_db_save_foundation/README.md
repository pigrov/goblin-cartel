# 0087 player_db_save_foundation

## Цель

Заложить серверный фундамент сохранения прогресса игрока в PostgreSQL до ввода предметов, инвентаря, рынка и рейтинговой логики.

## Сделано

- Добавлены Drizzle-таблицы:
  - `players` - базовая идентичность игрока без обязательной регистрации;
  - `player_devices` - device/session token hash для восстановления игрока;
  - `player_identities` - внешние проверенные идентичности игрока, первым провайдером заложен `vk_id`;
  - `player_saves` - единый JSON snapshot прогресса с `schemaVersion`, `contentVersion` и `revision`;
  - `player_scores` - нормализованные счетчики под будущие рейтинги.
- Добавлены миграции `0002_fancy_speedball.sql` и `0003_colossal_alex_wilder.sql`.
- Добавлен backend-модуль `player`:
  - bootstrap нового игрока и устройства;
  - восстановление по bearer token;
  - чтение save snapshot;
  - запись save snapshot с защитой от stale revision;
  - безопасная связка текущего player session с VK ID через backend verifier;
  - production verifier для VK ID, который читает `vk_id.client_id`, `vk_id.client_secret`, `vk_id.redirect_uri` и `vk_id.api_version` из encrypted app credentials;
  - upsert score rows под будущие leaderboard-сценарии.
- Добавлены API-роуты:
  - `POST /player/bootstrap`;
  - `GET /player/save`;
  - `PUT /player/save`;
  - `POST /player/link/vk-id`;
  - `PUT /player/scores`;
  - `GET /player/leaderboard/:scoreKey`.
- Добавлены unit tests на сервис и роуты.
- Добавлен клиентский player DB save client:
  - хранит device token локально;
  - строит API URL через общий `apiUrl`, чтобы web-dev мог работать через Vite proxy, а Android APK через `VITE_API_BASE_URL`;
  - вызывает `/api/player/bootstrap` после загрузки content bundle;
  - умеет вызвать `/api/player/link/vk-id` после VK ID авторизации в будущей Android/RuStore-обертке;
  - применяет server save только если `contentVersion` совпадает с текущей runtime-версией;
  - отправляет текущий локальный snapshot на `/api/player/save` с задержкой, не блокируя игру.
- Добавлен web/native bridge для VK ID:
  - поддерживает Capacitor plugin `GoblinCartelVkId.requestVkIdentity()`;
  - поддерживает прямой WebView bridge `window.GoblinCartelNative.requestVkIdentity()`;
  - принимает `accessToken` из VK ID Android SDK или authorization code + PKCE proof;
  - в браузере показывает, что VK ID доступен только в Android/RuStore-сборке.
- Добавлен Android/Capacitor wrapper в `apps/game-client/android`:
  - app id `ru.murph.goblincartel`;
  - native plugin `GoblinCartelVkId`, который вызывает VK ID SDK и возвращает web-клиенту `accessToken`, `idToken` и `providerUserId`;
  - инициализация VK ID SDK в Android `Application`;
  - VK ID manifest placeholders берутся из локального `vkid.properties` или env-переменных `VKID_CLIENT_ID`, `VKID_CLIENT_SECRET`, `VKID_REDIRECT_HOST`, `VKID_REDIRECT_SCHEME`;
  - тестовый APK собирается с `VITE_API_BASE_URL=https://goblin-cartel.murph.ru`, чтобы WebView ходил в production API, а не в локальный origin приложения;
  - реальные Android credentials не коммитятся, в репозитории лежит только `vkid.properties.example`.
- В настройки добавлен служебный статус синхронизации: подключение, очередь, отправка, сохранено, офлайн, конфликт/ошибка.
- Добавлена отправка первых `player_scores` из клиента:
  - `mine.current_depth_meters`;
  - `mine.max_depth_meters`;
  - `mine.current_destroyed_blocks`;
  - `mine.completed_count`;
  - `built_mines.total_count`;
  - `built_mines.active_count`;
  - `goblins.hired_count`;
  - `resources.wallet_total`.
- Добавлено серверное чтение публичного leaderboard по `scoreKey`, `seasonId` и `limit`, чтобы первые рейтинговые экраны можно было строить без новой миграции.
- Добавлен первый экран рейтинга в игровом клиенте:
  - отдельная вкладка нижнего меню;
  - переключение метрик: глубина, блоки, шахты, гоблины, кошелёк;
  - загрузка данных из `GET /player/leaderboard/:scoreKey`;
  - состояния загрузки, ошибки и пустого рейтинга.
- Добавлены client unit tests на bootstrap, upload, отсутствие токена и конфликт ревизии.

## Решения

- Предметы и инвентарь пока не вводятся, чтобы не тащить раннюю модель item/equipment/market в фундамент сохранений.
- Состояние игры пока хранится как единый JSON snapshot. Это быстрее подключить к текущему клиентскому `playerSave`, а критичные для будущего рейтинга значения вынесены отдельно в `player_scores`.
- Авторизация игрока на этом этапе анонимная: сервер выдает device token один раз, хранит только SHA-256 hash токена.
- VK ID связывается только через backend verifier: клиент не может просто прислать `userId`/имя и получить привязку профиля. Если VK ID уже привязан к другому игроку, текущий device token переносится на существующий `playerId`, чтобы новый телефон подтянул тот же server save.
- Для Android/RuStore основной путь: VK ID SDK отдает `AccessToken.token`, native bridge передает его в web-клиент, backend проверяет токен через VK API `users.get`. Для будущих сценариев также заложен authorization code + PKCE exchange.
- Android VK ID credentials нужны нативному SDK на устройстве, поэтому они конфигурируются отдельно от backend credentials: локально через `apps/game-client/android/vkid.properties`, в CI через env/secrets. Backend credentials по-прежнему должны храниться только в encrypted app credentials админки.
- Для web-dev `/api` проксируется Vite на `VITE_API_PROXY_TARGET` или `http://localhost:3000` по умолчанию. Если порт 3000 занят другим проектом, backend можно поднять на другом порту и выставить `VITE_API_PROXY_TARGET`.
- Конфликт записи решается через `expectedRevision`: если клиент пишет поверх более свежего server save, backend возвращает `revision_conflict`.
- На клиенте действует временная политика `client wins`: при `revision_conflict` клиент один раз повторяет upload поверх актуальной серверной ревизии. Это защищает свежий локальный прогресс от потери на текущей одноустройственной стадии.
- Server save подключен поверх текущего localStorage flow: сначала сервер может заменить локальный snapshot, затем уже существующая логика восстановления mine/roster/bossCards работает без отдельной развилки.

## Проверки

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm encoding:check`
- `pnpm --filter @goblin-cartel/backend test`
- `pnpm --filter @goblin-cartel/backend typecheck`
- `pnpm --filter @goblin-cartel/backend db:check`
- `pnpm --filter @goblin-cartel/game-client test`
- `pnpm --filter @goblin-cartel/game-client typecheck`
- `pnpm --filter @goblin-cartel/game-client cap:sync:android`
- `VITE_API_BASE_URL=https://goblin-cartel.murph.ru pnpm --filter @goblin-cartel/game-client build`
- `JAVA_HOME="Android Studio/jbr" ./gradlew.bat :app:assembleDebug` в `apps/game-client/android`
- `git diff --check`

## Дальше

1. В админке завести production credentials: `vk_id.client_id`, `vk_id.client_secret`, при необходимости `vk_id.redirect_uri` и `vk_id.api_version`.
2. Добавить подсветку собственной строки игрока, когда backend начнет возвращать текущего игрока в leaderboard context.
3. Добавить Android CI/RuStore build шаг после появления production VK ID credentials и signing config.
