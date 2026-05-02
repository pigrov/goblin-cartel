import { type CSSProperties } from "react";
import { Coins, Gem, Hammer, Mountain, Pickaxe, Sparkles, Zap } from "lucide-react";
import type { ContentBundle, RewardChestTypeConfig } from "@goblin-cartel/content-schemas";
import type { BossCardDefinition, BossCardId } from "@goblin-cartel/game-core";
import type { RewardChestStage } from "../useRewardChestFlow";

interface RewardDrop {
  amount: number;
  label: string;
  resourceId: string;
}

interface FeaturedCardReward extends RewardDrop {
  card: BossCardDefinition;
}

export interface ChestRewardFlyout extends RewardDrop {
  delayMs: number;
  distance: number;
  id: number;
  x: number;
}

export function RewardChestScreen(props: {
  chestType: RewardChestTypeConfig;
  content: ContentBundle;
  currentMineTitle: string;
  flyouts: ChestRewardFlyout[];
  labels: Record<string, string>;
  nextMineTitle: string | null;
  onContinue: () => void;
  onOpen: () => void;
  rewards: Record<string, number>;
  source: "mine_completion" | "cell";
  stage: RewardChestStage;
}) {
  const chestName = labelFromNameKey(props.chestType.nameKey, props.chestType.id, props.labels);
  const rewardDrops = rewardDropsFromMap(props.rewards, props.content, props.labels);
  const featuredCardReward = findFeaturedCardReward(rewardDrops, props.content);
  const isSummary = props.stage === "summary";
  const isCardRevealVisible = props.stage === "opening" && Boolean(featuredCardReward);
  const chestAssetClass = rewardChestAssetClass(props.chestType);

  return (
    <section className={`reward-chest-screen ${props.chestType.tier} ${chestAssetClass}`} aria-label="Открытие сундука">
      <div className="reward-chest-sky" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <header className="reward-chest-header">
        <p>{props.source === "mine_completion" ? "Рудник освоен" : "Сундук найден"}</p>
        <strong>{props.source === "mine_completion" ? props.currentMineTitle : chestName}</strong>
        <span>
          {props.source === "mine_completion"
            ? props.nextMineTitle
              ? `Дальше: ${props.nextMineTitle}`
              : "Следующий рудник скоро"
            : props.currentMineTitle}
        </span>
      </header>

      <div className="reward-chest-stage" aria-live="polite">
        <div className="reward-chest-glow" aria-hidden="true" />
        {props.flyouts.map((reward) => (
          <span
            className={`chest-reward-flyout ${resourceClassName(reward.resourceId)}`}
            key={reward.id}
            style={
              {
                "--delay": `${reward.delayMs}ms`,
                "--distance": `${reward.distance}px`,
                "--x": `${reward.x}px`
              } as CSSProperties
            }
          >
            <ResourceIcon resourceId={reward.resourceId} size={17} />
            +{formatInteger(reward.amount)}
          </span>
        ))}

        {featuredCardReward ? (
          <div
            className={`reward-card-reveal ${featuredCardReward.card.rarity} ${isCardRevealVisible ? "show" : ""}`}
            aria-hidden={!isCardRevealVisible}
          >
            <span>{bossCardRarityLabel(featuredCardReward.card.rarity)}</span>
            <BossCardArt card={featuredCardReward.card} />
            <strong>{bossCardName(featuredCardReward.card, props.labels)}</strong>
            <small>
              +{formatInteger(featuredCardReward.amount)} {featuredCardReward.label}
            </small>
          </div>
        ) : null}

        <button
          className={`reward-chest-box ${props.chestType.tier} ${chestAssetClass} ${props.stage}`}
          disabled={props.stage !== "closed"}
          onClick={props.onOpen}
          type="button"
          aria-label={`Открыть ${chestName}`}
        >
          <span className="reward-chest-lid" />
          <span className="reward-chest-hinge" />
          <span className="reward-chest-lock" />
          <span className="reward-chest-rune" />
          <span className="reward-chest-body" />
          <span className="reward-chest-bands" />
        </button>

        <div className={isSummary ? "reward-chest-summary show" : "reward-chest-summary"} aria-hidden={!isSummary}>
          <p>Получено</p>
          <strong>{chestName}</strong>
          <div className="reward-chest-rewards">
            {rewardDrops.length > 0 ? (
              rewardDrops.map((reward) => (
                <span className={`reward-chest-reward ${resourceClassName(reward.resourceId)}`} key={reward.resourceId}>
                  <ResourceIcon resourceId={reward.resourceId} size={18} />
                  <b>+{formatInteger(reward.amount)}</b>
                  <small>{reward.label}</small>
                </span>
              ))
            ) : (
              <span className="reward-chest-reward empty">Пусто</span>
            )}
          </div>
          <button onClick={props.onContinue} type="button">
            Продолжить
          </button>
        </div>
      </div>

      <p className="reward-chest-hint">
        {props.stage === "closed" ? "Тапни по сундуку" : props.stage === "opening" ? "Награды вылетают" : "Забираем добычу"}
      </p>
    </section>
  );
}

function rewardChestAssetClass(chestType: RewardChestTypeConfig): string {
  if (chestType.assetId.includes("steel")) {
    return "asset-steel";
  }

  if (chestType.assetId.includes("iron")) {
    return "asset-iron";
  }

  if (chestType.assetId.includes("golden")) {
    return "asset-golden";
  }

  return "asset-wooden";
}

function ResourceIcon(props: { resourceId: string; size: number }) {
  if (isBossCardResourceId(props.resourceId)) {
    return <BossCardResourceIcon resourceId={props.resourceId} size={props.size} />;
  }

  if (props.resourceId.includes("elixir")) {
    return <Zap size={props.size} />;
  }

  if (props.resourceId.includes("gold")) {
    return <Coins size={props.size} />;
  }

  if (props.resourceId.includes("copper")) {
    return <Gem size={props.size} />;
  }

  if (props.resourceId.includes("iron")) {
    return <Pickaxe size={props.size} />;
  }

  if (props.resourceId.includes("energy")) {
    return <Zap size={props.size} />;
  }

  return <Mountain size={props.size} />;
}

function BossCardResourceIcon(props: { resourceId: string; size: number }) {
  if (props.resourceId.includes("hit_damage")) {
    return <Hammer size={props.size} />;
  }

  if (props.resourceId.includes("crit_chance")) {
    return <Zap size={props.size} />;
  }

  if (props.resourceId.includes("crit_multiplier")) {
    return <Sparkles size={props.size} />;
  }

  if (props.resourceId.includes("max_energy")) {
    return <Gem size={props.size} />;
  }

  return <Sparkles size={props.size} />;
}

function BossCardArt(props: { card: BossCardDefinition }) {
  const className = `boss-card-art ${bossCardAssetClass(props.card)}`;

  switch (props.card.effectType) {
    case "critChance":
      return (
        <div className={className} aria-hidden="true">
          <span className="boss-card-art-face">
            <span className="boss-card-art-rune" />
            <Zap size={22} />
          </span>
        </div>
      );
    case "critMultiplier":
      return (
        <div className={className} aria-hidden="true">
          <span className="boss-card-art-face">
            <span className="boss-card-art-rune" />
            <Sparkles size={22} />
          </span>
        </div>
      );
    case "maxEnergy":
      return (
        <div className={className} aria-hidden="true">
          <span className="boss-card-art-face">
            <span className="boss-card-art-rune" />
            <Gem size={22} />
          </span>
        </div>
      );
    default:
      return (
        <div className={className} aria-hidden="true">
          <span className="boss-card-art-face">
            <span className="boss-card-art-rune" />
            <Hammer size={22} />
          </span>
        </div>
      );
  }
}

function bossCardAssetClass(card: BossCardDefinition): string {
  const assetId = card.assetId ?? "";

  if (assetId.includes("crit_chance")) {
    return "crit-chance";
  }

  if (assetId.includes("crit_multiplier")) {
    return "crit-multiplier";
  }

  if (assetId.includes("max_energy")) {
    return "max-energy";
  }

  if (assetId.includes("hit_damage")) {
    return "hit-damage";
  }

  switch (card.effectType) {
    case "critChance":
      return "crit-chance";
    case "critMultiplier":
      return "crit-multiplier";
    case "maxEnergy":
      return "max-energy";
    default:
      return "hit-damage";
  }
}

function resourceClassName(resourceId: string): string {
  if (isBossCardResourceId(resourceId)) {
    if (resourceId.includes("crit_multiplier")) {
      return "card card-golden";
    }

    if (resourceId.includes("crit_chance")) {
      return "card card-rare";
    }

    return "card card-common";
  }

  if (resourceId.includes("elixir")) {
    return "elixir";
  }

  if (resourceId.includes("gold")) {
    return "gold";
  }

  if (resourceId.includes("copper")) {
    return "copper";
  }

  if (resourceId.includes("iron")) {
    return "iron";
  }

  if (resourceId.includes("energy")) {
    return "energy";
  }

  return "stone";
}

function isBossCardResourceId(resourceId: string): boolean {
  return resourceId.startsWith("boss_card_");
}

function bossCardName(card: BossCardDefinition | undefined, labels: Record<string, string>): string {
  if (!card) {
    return "Карта";
  }

  return labelFromNameKey(card.nameKey, bossCardFallbackName(card.id), labels);
}

function bossCardFallbackName(cardId: BossCardId): string {
  switch (cardId) {
    case "crit_chance":
      return "Критический шанс";
    case "crit_multiplier":
      return "Сила крита";
    case "hit_damage":
      return "Сила удара";
    case "max_energy":
      return "Запас энергии";
    default:
      return "Карта босса";
  }
}

function bossCardRarityLabel(rarity: BossCardDefinition["rarity"]): string {
  switch (rarity) {
    case "golden":
      return "золотая";
    case "rare":
      return "редкая";
    case "common":
      return "обычная";
  }
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

function rewardDropsFromMap(rewards: Record<string, number>, content: ContentBundle, labels: Record<string, string>): RewardDrop[] {
  return Object.entries(rewards)
    .filter(([, amount]) => amount > 0)
    .sort(([leftResourceId], [rightResourceId]) => leftResourceId.localeCompare(rightResourceId))
    .map(([resourceId, amount]) => ({
      amount,
      label: resourceLabelById(resourceId, labels, content),
      resourceId
    }));
}

function findFeaturedCardReward(rewards: RewardDrop[], content: ContentBundle): FeaturedCardReward | null {
  const cardByResourceId = new Map<string, BossCardDefinition>(content.bossCards.map((card) => [card.cardResourceId, card]));
  const cardRewards: FeaturedCardReward[] = [];

  for (const reward of rewards) {
    const card = cardByResourceId.get(reward.resourceId);

    if (card) {
      cardRewards.push({ ...reward, card });
    }
  }

  if (cardRewards.length === 0) {
    return null;
  }

  return cardRewards.sort((left, right) => {
    const rarityDelta = bossCardRarityRank(right.card.rarity) - bossCardRarityRank(left.card.rarity);
    return rarityDelta !== 0 ? rarityDelta : right.amount - left.amount;
  })[0] ?? null;
}

function bossCardRarityRank(rarity: BossCardDefinition["rarity"]): number {
  switch (rarity) {
    case "golden":
      return 3;
    case "rare":
      return 2;
    case "common":
      return 1;
  }
}

function resourceLabelById(resourceId: string, labels: Record<string, string>, content: ContentBundle): string {
  const resource = content.resources.find((item) => item.id === resourceId);
  return resource ? labelFromNameKey(resource.nameKey, resource.id, labels) : resourceId;
}

function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
}
