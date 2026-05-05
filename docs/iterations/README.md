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
- `0035_pixi_reconciliation_ticker` - extracted Pixi block/effect reconciliation and animation ticker, tightened the boss energy overlay, and made the lift rail grow with platform depth.
- `0036_pixi_drag_input_lift_rail` - moved Pixi drag placement into input handling, shifted the lift left, and animated rail height with platform descent.
- `0037_pixi_app_lifecycle_modal_layer` - extracted Pixi app/layers lifecycle and lifted modals above the boss energy overlay.
- `0038_pixi_viewport_render_passes` - extracted Pixi viewport binding, renderer resize, and scene render passes from the React scene component.
- `0039_pixi_runtime_hook_delayed_rewards` - moved Pixi runtime refs/ticker into a hook and delayed visible resource rewards until the hit animation completes.
- `0040_resource_display_hook_energy_tick` - moved delayed visible resource rewards into a hook/controller with tests and made boss energy refill in steady integer ticks.
- `0041_independent_goblin_mining_60m_mine` - decoupled goblin auto-mining from boss taps, normalized the test mine to 60m, and captured next-step mine completion ideas.
- `0042_vein_built_mine_core` - added content/core support for veins, found veins, built mine types, mine income accumulation, and manual collection.
- `0043_vein_mines_ui` - connected veins to the client UI with Pixi vein visuals, found-vein modal, mines tab, build action, mine storage, and manual collection.
- `0044_next_mine_progression` - added a second mine template and client progression that unlocks the next mine after building a permanent mine from the current vein.
- `0045_mine_completion_event` - added a one-time mine completion modal with summary, next-mine action, and persisted dismissal state.
- `0046_reward_chest_opening` - added reward chest content, core reward rolling, and a full-screen chest opening flow before next-mine continuation.
- `0047_mine_clear_vein_transition_chest` - moved vein discovery to full mine clear, fixed mine ordering, shortened test mines to 10m, and made transition chests open only when starting the next mine.
- `0048_built_mines_construction_ui` - improved built-mine cards with build costs, missing resources, construction timers, and storage progress.
- `0049_permanent_mines_screen` - expanded the permanent mines tab with dashboard stats, collect-all income, grouped build projects, explicit mine states, and safer top spacing.
- `0050_built_mine_auto_collectors` - added collector goblin assignment and automatic built-mine income collection, including offline restore handling.
- `0051_collector_specializations_admin_content_tools` - added collector specializations/effective mine bonuses, a collector picker modal, and first admin content template tools.
- `0052_admin_entity_forms` - added admin entity forms for editing goblins, mine templates, and built mine types before applying changes to draft JSON.
- `0053_admin_entity_server_save` - added backend entity-save for admin content forms with server-side validation, audit logging, and draft refresh in the admin UI.
- `0054_admin_nested_content_forms` - added nested admin forms for rewards, costs, mine strata, guaranteed objects, block types, reward chests, and compacted draft version creation.
- `0055_admin_content_routes_templates` - moved Content version selection to `/admin/content`, added direct version routes, and added block/chest creation templates with admin unit tests.
- `0056_admin_mine_visual_editor_goblin_grab` - added the first admin mine visual editor for strata/objects and enlarged the Pixi goblin grab hit area.
- `0057_mine_cell_map_paint_editor` - replaced mine strata editing with an admin paint-grid cell map, added cell-level HP multipliers, and kept strata as legacy generator fallback.
- `0058_mine_editor_cell_width_and_hp` - made the admin mine grid match game cave width, moved brush selection to legend buttons, prevented initial wrong-cell flicker, and removed hidden depth HP scaling.
- `0059_content_versions_read_only` - made published and archived content versions read-only in UI and backend, blocking save, validate, and republish actions.
- `0060_mine_editor_cell_chests_iron` - cleaned old production content versions, added mine row depth/difficulty labels, cell edit modal with exact HP, reward-chest cells, and iron content.
- `0061_cell_map_legacy_cleanup` - removed legacy mine strata/seed/guaranteed-object support, made cell maps the only mine model, renamed the old wooden chest block to gold cache, and hid raw JSON behind an advanced toggle.
- `0062_content_publish_guardrails` - removed game-client content fallback/runtime test depth, made admin JSON read-only, and added broken-text validation for content release checks.
- `0063_mine_progression_upgrades` - added the first permanent-mine upgrade loop and initial stricter mine progression.
- `0064_content_driven_mine_upgrades` - moved mine-upgrade balance into content/admin, made next-mine transition available after clearing, and expanded starter mines to five.
- `0065_goblin_hut_progression` - added goblin leveling content/admin fields, a Goblin Hut screen, and level-driven miner/collector bonuses.
- `0066_goblin_roles_construction_tabs` - split goblin roles across mining, collection, and construction support, and rebuilt the Goblin Hut screen with role tabs.
- `0067_goblin_hut_v2_level_growth` - rebuilt Goblin Hut as compact goblin cards with details modal, split names/nicknames, gold-only upgrades, and level-scaling construction bonuses.
- `0068_hut_upgrade_progression` - added content-driven Hut upgrades with hired-goblin limits, role unlocks, hire/leveling discounts, progress-gated requirements, game UI, and admin editing.
- `0069_hut_balance_ci_chunks_visuals` - updated GitHub Actions to v5, split the game-client bundle, rebalanced Hut upgrade costs/requirements, and added level-based Hut visuals.
- `0070_base_screen_save_migrations` - separated Base upgrades from goblin management and added stable player save migration so content version updates do not reset progress.
- `0071_boss_cards_elixir_pixi_stable` - added Boss cards with Elixir upgrades and stabilized Pixi production chunking to fix the main screen crash.
- `0072_content_driven_boss_cards` - moved Boss card balance into content/admin and rebuilt the Boss cards modal as a compact 3-column card grid.
- `0073_boss_card_visuals_goblin_grab` - added content-driven Boss card asset IDs, effect-specific card visuals, chest drop balance summary, and a larger Pixi goblin grab area.
- `0074_chest_card_art_balance` - improved card/chest art, split card reward visuals by rarity, and rebalanced chest drops with safe legacy normalization.
- `0075_chest_card_reveal_no_legacy_versions` - added a large Boss card reveal during chest opening and removed old runtime/backend/save fallbacks for previous content versions.
- `0076_goblin_drag_chest_balance_vein_persistence` - normalized Pixi goblin drag hitboxes, added admin chest/card drop balance controls, and kept unbuilt found veins after moving to the next mine.
- `0077_client_app_refactor` - split the game client App shell into screen components, controller hooks, and view-model builders before production deploy.
- `0078_foreman_tower_elevator` - added foreman tower assignments, offline foreman bonuses, platform goblin statuses, and the first upgradeable elevator with platform slot limits.
- `0079_mine_depth_rewards_deploy` - added content-driven rewards for platform depth progress, row-clear event UI, elevator descent polish, and release checks before production push.
- `0080_mine_run_stats_progress` - added persisted mine-run statistics, completion reward breakdown, and an in-mine progress modal with depth and vein details.
- `0081_goblin_instance_foundation` - added template-backed goblin instances to prepare random hiring, rolled stats, equipment, traits, and future market mechanics.
- `0082_goblin_generation_rules` - added content/admin rules for random goblin contracts and a deterministic game-core roll function for unique goblin instances.
- `0083_random_goblin_contract_hire` - connected random goblin contracts to the Hut purchase flow with resource spend, reveal UI, saved rolled instances, and contract preview tests.
- `0084_random_goblin_runtime_mining` - connected rolled miner instances to mine runtime placement, Pixi names, offline mining, and damage calculation from rolled stats.
- `0085_random_goblin_instance_upgrades` - added upgrade support for a concrete rolled goblin instance without leveling its template goblin.
- `0086_random_goblin_details_modal` - added a details modal for concrete random goblins with stat growth, traits, upgrade cost, and future equipment slots.
- `0087_player_db_save_foundation` - added backend player identity, device tokens, versioned save snapshots, score rows, Drizzle migration, API routes, client bootstrap/sync, Android VK ID bridge, and tests before item/inventory work.
- `0088_android_cors_fix` - allowed Capacitor/WebView origins in production CORS so Android APK can load the production API.
- `0089_mine_screen_layout_background` - moved mine action buttons into the left control column, removed depth labels, and expanded the mine play area with a full background.
- `0090_random_goblin_renders_admin_upload` - added backend-hosted goblin render uploads in admin, public asset serving, and production asset volume docs.
- `0091_goblin_generation_render_pool` - moved random goblin render selection into generation archetypes and stored selected asset IDs on rolled goblin instances.
- `0092_goblin_generation_template_cleanup` - removed template goblins from content/runtime, moved random goblin ability, leveling, specialization, and renders into generation archetypes, and rebuilt starter content with 10 mines plus 100+ names/nicknames.
- `0093_legacy_cleanup_asset_upload` - removed remaining old-content fallbacks and raised nginx/backend upload body limits for 5 MB goblin render files.
- `0094_foreman_offline_report` - added an in-mine foreman offline report with relocation count, destroyed blocks, elapsed time, rewards, and a focused unit test.
- `0095_mine_column_tactics` - added per-column mine tactics hints showing current DPS, best miner DPS, tag bonuses, and whether a column needs a better miner.
- `0096_goblin_screen_cards` - rebuilt hired random goblins as compact card-style UI with larger detail modal and admin-uploaded render requirements.
- `0097_goblin_contract_reveal_cards` - rebuilt random goblin hire contracts and reveal modal into the same compact card-style UI with rarity odds and stat ranges.
- `0098_hire_card_asset_skin` - added configurable content/admin asset skin slots for goblin hire cards, seeded the production asset pack, and wired client cards through asset IDs.
- `0099_hire_card_simplification` - rebuilt the Goblins screen visual skin with admin-uploaded backgrounds, title plates, hire-card assets, owned-goblin cards, Russo One typography, and gold-only random hire contracts.
