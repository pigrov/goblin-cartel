import {
  createMiningSession,
  generateMine,
  hitMineBlock,
  type MiningBlockState,
  type MiningSession
} from "@goblin-cartel/game-core";
import {
  starterContentBundle,
  type BlockTypeConfig,
  type ContentBundle,
  type MineTemplateConfig,
  type ResourceConfig
} from "@goblin-cartel/content-schemas";
import { Bot, Hammer, Pickaxe, RotateCcw, Settings, Users, Warehouse } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const hitDamage = 28;
const mineSeed = "local-player-001";

interface ContentState {
  content: ContentBundle;
  version: string;
  source: "published" | "fallback";
  message: string;
}

export function App() {
  const [contentState, setContentState] = useState<ContentState>(() => ({
    content: starterContentBundle,
    version: "fallback",
    source: "fallback",
    message: "Стартовый локальный контент"
  }));
  const [loadingContent, setLoadingContent] = useState(true);
  const [session, setSession] = useState<MiningSession>(() => createSession(starterContentBundle));
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });

  useEffect(() => {
    let active = true;

    async function loadContent() {
      try {
        const response = await fetch("/api/content/current", {
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(response.status === 404 ? "Нет опубликованного контента" : "Контент не загрузился");
        }

        const payload = (await response.json()) as {
          version: { version: string };
          content: ContentBundle;
        };

        if (active) {
          setContentState({
            content: payload.content,
            version: payload.version.version,
            source: "published",
            message: "Опубликованный контент"
          });
          setSession(createSession(payload.content));
        }
      } catch (error) {
        if (active) {
          setContentState({
            content: starterContentBundle,
            version: "fallback",
            source: "fallback",
            message: error instanceof Error ? error.message : "Стартовый локальный контент"
          });
          setSession(createSession(starterContentBundle));
        }
      } finally {
        if (active) {
          setLoadingContent(false);
        }
      }
    }

    void loadContent();

    return () => {
      active = false;
    };
  }, []);

  const resourceById = useMemo(
    () => new Map(contentState.content.resources.map((resource) => [resource.id, resource])),
    [contentState.content.resources]
  );
  const blockTypeById = useMemo(
    () => new Map(contentState.content.blockTypes.map((blockType) => [blockType.id, blockType])),
    [contentState.content.blockTypes]
  );
  const mineTemplate = contentState.content.mineTemplates[0];
  const visibleBlocks = session.blocks.flat().slice(0, Math.min(56, session.mine.width * session.mine.height));
  const activeBlock = session.blocks[activeCell.row]?.[activeCell.col] ?? visibleBlocks[0];

  function handleBlockHit(block: MiningBlockState) {
    if (block.destroyed) {
      setActiveCell({ row: block.row, col: block.col });
      return;
    }

    setActiveCell({ row: block.row, col: block.col });
    setSession((current) =>
      hitMineBlock(current, contentState.content.blockTypes, {
        row: block.row,
        col: block.col,
        damage: hitDamage
      })
    );
  }

  function handleResetMine() {
    setSession(createSession(contentState.content));
    setActiveCell({ row: 0, col: 0 });
  }

  return (
    <main className="game-shell">
      <section className="phone-frame" aria-label="Игровой экран">
        <header className="resource-bar">
          {contentState.content.resources.slice(0, 4).map((resource) => (
            <ResourceChip
              key={resource.id}
              resource={resource}
              value={session.resources[resource.id] ?? 0}
            />
          ))}
        </header>

        <section className="mine-header">
          <div>
            <p>{contentState.source === "published" ? `Content ${contentState.version}` : contentState.message}</p>
            <strong>{mineTitle(mineTemplate)}</strong>
          </div>
          <button className="icon-button" onClick={handleResetMine} title="Сбросить шахту" type="button" aria-label="Сбросить шахту">
            <RotateCcw size={19} />
          </button>
          <button className="icon-button" type="button" aria-label="Настройки">
            <Settings size={19} />
          </button>
        </section>

        <section className="goblin-platform" aria-label="Бригада">
          <div className="goblin">Грызз</div>
          <div className="goblin">Мык</div>
          <div className="goblin locked">Пип</div>
        </section>

        <section
          className="mine-grid"
          style={{ gridTemplateColumns: `repeat(${session.mine.width}, minmax(0, 1fr))` }}
          aria-label="Рудник"
        >
          {visibleBlocks.map((block) => {
            const blockType = blockTypeById.get(block.blockTypeId);
            return (
              <button
                className={blockClassName(block)}
                disabled={block.destroyed}
                key={`${block.row}:${block.col}`}
                onClick={() => handleBlockHit(block)}
                type="button"
              >
                <span>{block.destroyed ? "" : block.hp}</span>
                <i style={{ width: `${blockHpPercent(block)}%` }} />
                <b>{shortBlockLabel(blockType)}</b>
              </button>
            );
          })}
        </section>

        <section className="boss-panel">
          <button
            className="boss-button"
            disabled={!activeBlock || activeBlock.destroyed}
            onClick={() => activeBlock && handleBlockHit(activeBlock)}
            type="button"
          >
            <Hammer size={20} />
            Удар босса
          </button>
          <div className="active-block">
            <span>{activeBlock ? blockName(activeBlock, blockTypeById) : "Нет блока"}</span>
            <strong>
              {activeBlock && !activeBlock.destroyed ? `${activeBlock.hp}/${activeBlock.maxHp} HP` : "разбит"}
            </strong>
          </div>
          <div className="reward-line">
            {Object.keys(session.lastRewards).length > 0
              ? Object.entries(session.lastRewards)
                  .map(([resourceId, amount]) => `+${amount} ${resourceLabel(resourceById.get(resourceId), resourceId)}`)
                  .join(" · ")
              : loadingContent
                ? "Загружаем контент"
                : `${session.destroyedBlocks} блоков разбито`}
          </div>
        </section>

        <nav className="bottom-nav" aria-label="Основная навигация">
          <button className="active" type="button">
            <Pickaxe size={18} />
            Рудник
          </button>
          <button type="button">
            <Users size={18} />
            Гоблины
          </button>
          <button type="button">
            <Warehouse size={18} />
            Шахты
          </button>
          <button type="button">
            <Bot size={18} />
            Авто
          </button>
        </nav>
      </section>
    </main>
  );
}

function createSession(content: ContentBundle): MiningSession {
  const mineTemplate = content.mineTemplates[0];

  if (!mineTemplate) {
    return createMiningSession({
      mine: generateMine(starterContentBundle.mineTemplates[0] as MineTemplateConfig, mineSeed),
      blockTypes: starterContentBundle.blockTypes
    });
  }

  return createMiningSession({
    mine: generateMine(mineTemplate, mineSeed),
    blockTypes: content.blockTypes,
    mineDifficultyMultiplier: mineTemplate.difficulty
  });
}

function ResourceChip(props: { resource: ResourceConfig; value: number }) {
  return (
    <div className={`resource-chip ${resourceClassName(props.resource.id)}`}>
      <span>{resourceLabel(props.resource, props.resource.id)}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function blockClassName(block: MiningBlockState): string {
  const classes = ["mine-block", block.blockTypeId.replaceAll("_", "-")];

  if (block.destroyed) {
    classes.push("destroyed");
  }

  return classes.join(" ");
}

function blockHpPercent(block: MiningBlockState): number {
  return Math.max(0, Math.min(100, (block.hp / block.maxHp) * 100));
}

function resourceClassName(resourceId: string): string {
  if (resourceId.includes("gold")) {
    return "gold";
  }

  if (resourceId.includes("copper")) {
    return "copper";
  }

  if (resourceId.includes("energy")) {
    return "energy";
  }

  return "stone";
}

function shortBlockLabel(blockType?: BlockTypeConfig): string {
  if (!blockType) {
    return "?";
  }

  if (blockType.id === "copper_ore") {
    return "Cu";
  }

  if (blockType.specialBehavior === "chest") {
    return "Box";
  }

  return blockType.id.slice(0, 2).toUpperCase();
}

function blockName(block: MiningBlockState, blockTypeById: Map<string, BlockTypeConfig>): string {
  return blockTypeById.get(block.blockTypeId)?.nameKey ?? block.blockTypeId;
}

function resourceLabel(resource: ResourceConfig | undefined, fallback: string): string {
  if (!resource) {
    return fallback;
  }

  const labels: Record<string, string> = {
    gold: "Золото",
    stone: "Камень",
    copper_ore: "Медь",
    boss_energy: "Энергия"
  };

  return labels[resource.id] ?? resource.id;
}

function mineTitle(mineTemplate: MineTemplateConfig | undefined): string {
  if (!mineTemplate) {
    return "Рудник не найден";
  }

  if (mineTemplate.id === "old_well_01") {
    return `Старый колодец · ${mineTemplate.depthMeters} м`;
  }

  return `${mineTemplate.id} · ${mineTemplate.depthMeters} м`;
}
