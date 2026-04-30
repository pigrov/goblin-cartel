# Итерации разработки

Эта папка хранит фактический контекст разработки по итерациям.

Правила:

1. Каждая итерация живет в отдельной папке вида `0001_name_iteration`.
2. Внутри обязательно есть `README.md` с целью, решениями, сделанным, проверками и открытыми вопросами.
3. В конце работы по итерации контекст обновляется по факту, а не задним числом красивым планом.
4. Общие правила описаны в `docs/10_development_rules.md`.

Текущие итерации:

- `0001_project_foundation` - изучение стартовых документов и фиксация обязательного регламента разработки.
- `0002_project_bootstrap` - разворачивание monorepo, CI/CD и серверного профиля.
- `0003_server_https` - выпуск TLS-сертификата, переключение Nginx на HTTPS и проверка production URL.
- `0004_admin_auth` - bootstrap-вход в админку, установка пароля и базовые backend-сессии.
- `0005_admin_credentials` - раздел зашифрованных credentials в админке.
- `0006_content_versions` - версии контента, валидация, публикация и выдача текущего конфига.
- `0007_game_client_content_loop` - подключение игрового клиента к content bundle и первый playable mining loop.
- `0008_mine_screen_save` - улучшение экрана рудника и локальное сохранение прогресса.
- `0009_content_localization` - локализация названий через content bundle вместо клиентской таблицы.
- `0010_goblin_content` - базовые сущности гоблинов в content bundle и отображение бригады из контента.
- `0011_goblin_roster` - локальный найм гоблинов, сила бригады и первый экран гоблинов.
- `0012_goblin_auto_mining` - автоматическая добыча гоблинами, offline progress и видимый финальный удар.
- `0013_visible_goblin_mining` - видимые гоблины на колонках, удары только по открытым сверху блокам.
- `0014_manual_goblin_placement` - ручное размещение гоблинов по колонкам, column offline mining и эффекты ударов.
- `0015_boss_energy` - расход и восстановление энергии босса, компактный energy block и модалка параметров.
- `0016_mine_layout_energy_goblins` - полноэкранный телефонный layout, две нижние карточки энергии/гоблинов и скролл только области камней.
- `0017_surface_platform_mining` - поверхность, платформенная добыча гоблинов по текущему ряду, метки глубины и сохранение `platformRow`.
- `0018_playfield_platform_lift` - общий скролл поверхности и шахты, платформа внутри шахты и левый механизм спуска.
- `0019_platform_overlay_pixi_plan` - платформа как overlay поверх цельной шахты, более плавный спуск и план перехода визуального слоя на PixiJS.
- `0020_platform_overlay_anchor_fix` - исправление привязки overlay-платформы к `.mine-grid`, а не к верхней части игровой области.
- `0029_pixi_dev_overlay_resource_tooltips` - Pixi dev overlay, resource counter tooltips, removal of DOM pickup trails, and immediate boss hit input.
- `0030_pixi_hit_test_destroy_fx` - Pixi hit-test details in the dev overlay and richer procedural block destruction shards.
- `0031_pixi_effects_module_near_break` - extracted Pixi hit effects into a module and added near-break block visuals.
- `0032_pixi_goblin_module_text_motion` - extracted Pixi goblin drawing, widened goblin grab hit area, and adjusted hit text motion.
- `0033_pixi_surface_platform_blocks` - extracted Pixi surface, platform, and block drawing modules with a brighter surface and glass header.
- `0034_pixi_background_depth_input` - extracted Pixi background, depth markers, and input handling with a taller surface, compact glass boss energy overlay, and 200m test mine.
