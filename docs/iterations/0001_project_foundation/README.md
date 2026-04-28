# 0001 project foundation

**Дата старта:** 2026-04-28
**Статус:** завершена

## Цель

Изучить стартовые документы в `docs/`, зафиксировать обязательные правила разработки и создать первый контекст итерации, от которого дальше можно вести проект без потери решений.

## Входной контекст

Изучены документы:

- `docs/00_README.md`;
- `docs/01_game_concept.md`;
- `docs/02_mvp_and_roadmap.md`;
- `docs/03_stack_architecture.md`;
- `docs/04_admin_cms_and_generation.md`;
- `docs/05_game_systems_economy.md`;
- `docs/06_rustore_release_plan.md`;
- `docs/07_backend_api_and_data_model.md`;
- `docs/08_ui_ux_style_guide.md`;
- `docs/09_sample_configs.md`.

Ключевые дополнительные требования владельца проекта:

- настроить CI/CD через `git@github.com:pigrov/goblin-cartel.git`;
- деплой на сервер через `ssh selectel-transcribe`;
- для БД использовать Drizzle и drizzle-kit;
- с самого начала вести документацию в `docs/iterations/0001_name_iteration`;
- делать unit tests;
- проводить UTF-8 и mojibake checks, потому что проект на русском языке;
- сразу фиксировать общие UI styles и брать их из общего файла;
- все ключи и env-переменные, кроме базовых runtime-переменных, настраивать в админке и хранить зашифрованными в БД через `APP_CREDENTIALS_MASTER_KEY`;
- bootstrap-доступ к админке задавать через `APP_BOOTSTRAP_ADMIN_EMAILS`, первый вход без пароля, затем обязательная установка пароля.

## Решения

1. Создан общий регламент `docs/10_development_rules.md`.
2. Требование Drizzle + drizzle-kit зафиксировано как обязательное и более приоритетное, чем раннее допущение Prisma или Drizzle.
3. В `docs/07_backend_api_and_data_model.md` старое допущение Prisma или Drizzle заменено на Drizzle ORM + drizzle-kit.
4. `docs/08_ui_ux_style_guide.md` назначен обязательным источником UI-стиля.
5. Введена структура `docs/iterations/` для накопления контекста.
6. Добавлен базовый локальный инструмент проверки текстовых файлов: `tools/check-text-encoding.ps1`.
7. Добавлены `.editorconfig` и `.gitattributes` для фиксации UTF-8/LF правил на уровне репозитория.

## Сделано

- Изучена папка `docs/`.
- Проверено, что видимые битые символы при первом чтении были проблемой кодировки вывода PowerShell, а не самих файлов.
- Создан регламент разработки и итераций.
- Создана первая папка итерации.
- Добавлена базовая проверка UTF-8 и типичных mojibake-последовательностей.

## Измененные файлы

- `.editorconfig`;
- `.gitattributes`;
- `docs/00_README.md`;
- `docs/07_backend_api_and_data_model.md`;
- `docs/10_development_rules.md`;
- `docs/iterations/README.md`;
- `docs/iterations/0001_project_foundation/README.md`;
- `tools/check-text-encoding.ps1`.

## Проверки

Проверки кода пока не запускались, потому что в репозитории еще нет приложения, пакетов и тестового раннера.

Проверка документации и кодировки:

```text
powershell -ExecutionPolicy Bypass -File tools\check-text-encoding.ps1 docs tools
```

Результат: пройдена.

## UTF-8 и текст

Файлы `docs/*.md` прочитаны как UTF-8. Первичный mojibake в терминале был устранен установкой UTF-8 encoding для PowerShell-вывода.

Дополнительно скрипт `tools/check-text-encoding.ps1` был исправлен так, чтобы корректно запускаться в Windows PowerShell: Unicode-последовательности для поиска собираются по кодам символов, а не хранятся в самом `.ps1` как кириллические литералы.

## CI/CD и миграции

CI/CD пока не настроен, потому что проект еще не содержит приложения и Git-репозиторий в текущей рабочей папке не инициализирован.

Целевые параметры зафиксированы:

- Git remote: `git@github.com:pigrov/goblin-cartel.git`;
- deploy host: `ssh selectel-transcribe`;
- migrations: Drizzle + drizzle-kit.

## Открытые вопросы

1. Какой backend framework выбрать окончательно: Fastify или NestJS?
2. Какой process manager использовать на сервере: systemd, Docker Compose или другой вариант?
3. Какие health endpoints нужны для первого CD smoke-check?
4. Какой package name зафиксировать для Android перед RuStore: например `com.dima.goblincartel` или другой?
