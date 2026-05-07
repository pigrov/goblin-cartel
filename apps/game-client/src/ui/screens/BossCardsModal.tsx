import { Gem, Hammer, Sparkles, X, Zap } from "lucide-react";
import { useState } from "react";
import {
  calculateBossCardUpgradeCost,
  type BossCardDefinition,
  type BossCardId,
  type BossCardState
} from "@goblin-cartel/game-core";
import { GameFullscreenModal } from "../components/GameFullscreenModal";

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

export function BossCardsModal(props: {
  cards: BossCardDefinition[];
  labels: Record<string, string>;
  message: string | null;
  onClose: () => void;
  onUpgrade: (cardId: BossCardId) => void;
  resources: Record<string, number>;
  state: BossCardState;
}) {
  const [selectedCardId, setSelectedCardId] = useState<BossCardId | null>(null);
  const selectedCard = props.cards.find((card) => card.id === selectedCardId) ?? null;

  return (
    <GameFullscreenModal ariaLabel="Карты босса" contentClassName="boss-cards-modal" onClose={props.onClose} title="Карты">
      <header className="mine-modal-heading">
        <span>Босс</span>
        <strong>Карты дают постоянные усиления</strong>
      </header>

      <div className="boss-cards-list">
        {props.cards.map((card) => {
          const level = props.state.levels[card.id] ?? 0;
          const cost = calculateBossCardUpgradeCost(card, props.state);
          const availableCards = props.resources[card.cardResourceId] ?? 0;
          const availableElixir = props.resources.elixir ?? 0;
          const cardProgress = cost ? Math.min(100, (availableCards / cost.cardAmount) * 100) : 100;
          const canUpgrade = Boolean(cost && availableCards >= cost.cardAmount && availableElixir >= cost.elixirAmount);

          return (
            <article className={`boss-card ${card.rarity}`} key={card.id} onClick={() => setSelectedCardId(card.id)}>
              <BossCardArt card={card} />
              <div className="boss-card-copy">
                <div className="boss-card-title">
                  <span>{bossCardRarityLabel(card.rarity)}</span>
                  <strong>{bossCardName(card, props.labels)}</strong>
                </div>
                <p>{bossCardDescription(card, props.labels)}</p>
                <div className="boss-card-effect">
                  <span>Ур. {level}</span>
                  <strong>{bossCardEffectLabel(card)}</strong>
                </div>
                {cost ? (
                  <div className="boss-card-progress">
                    <div>
                      <span>Карты</span>
                      <strong>
                        {formatInteger(Math.min(availableCards, cost.cardAmount))}/{formatInteger(cost.cardAmount)}
                      </strong>
                    </div>
                    <i aria-hidden="true">
                      <b style={{ width: `${cardProgress}%` }} />
                    </i>
                    <div>
                      <span>Эликсир</span>
                      <strong>
                        {formatInteger(Math.min(availableElixir, cost.elixirAmount))}/{formatInteger(cost.elixirAmount)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="boss-card-progress maxed">
                    <strong>Максимальный уровень</strong>
                  </div>
                )}
              </div>
              <button
                disabled={!canUpgrade}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onUpgrade(card.id);
                }}
                type="button"
              >
                {cost ? "Улучшить" : "Макс."}
              </button>
            </article>
          );
        })}
      </div>

      {props.message ? <p className="boss-cards-message">{props.message}</p> : null}

      {selectedCard ? (
        <BossCardDetail
          card={selectedCard}
          labels={props.labels}
          onClose={() => setSelectedCardId(null)}
          onUpgrade={props.onUpgrade}
          resources={props.resources}
          state={props.state}
        />
      ) : null}
    </GameFullscreenModal>
  );
}

function BossCardDetail(props: {
  card: BossCardDefinition;
  labels: Record<string, string>;
  onClose: () => void;
  onUpgrade: (cardId: BossCardId) => void;
  resources: Record<string, number>;
  state: BossCardState;
}) {
  const level = props.state.levels[props.card.id] ?? 0;
  const cost = calculateBossCardUpgradeCost(props.card, props.state);
  const availableCards = props.resources[props.card.cardResourceId] ?? 0;
  const availableElixir = props.resources.elixir ?? 0;
  const cardProgress = cost ? Math.min(100, (availableCards / cost.cardAmount) * 100) : 100;
  const canUpgrade = Boolean(cost && availableCards >= cost.cardAmount && availableElixir >= cost.elixirAmount);

  return (
    <div className="boss-card-detail-backdrop" onClick={props.onClose} role="presentation">
      <article className={`boss-card-detail ${props.card.rarity}`} onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Карта босса</p>
            <strong>{bossCardName(props.card, props.labels)}</strong>
          </div>
          <button className="boss-modal-close" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={24} />
          </button>
        </header>

        <div className="boss-card-detail-body">
          <BossCardArt card={props.card} />
          <section className="boss-card-detail-info">
            <div>
              <strong>Карточка</strong>
              <span>{bossCardRarityLabel(props.card.rarity)}</span>
            </div>
            <p>{bossCardDescription(props.card, props.labels)}</p>
          </section>
        </div>

        <strong className="boss-card-detail-level">Уровень {level}</strong>
        <section className="boss-card-detail-next">
          <span>Бонус на следующем уровне</span>
          <strong>
            {bossCardValueLabel(props.card, level)} <b>→</b> {bossCardValueLabel(props.card, Math.min(props.card.maxLevel, level + 1))}
          </strong>
        </section>

        {cost ? (
          <section className="boss-card-detail-cost">
            <div>
              <span>Карты</span>
              <strong>{formatInteger(Math.min(availableCards, cost.cardAmount))}/{formatInteger(cost.cardAmount)}</strong>
            </div>
            <i aria-hidden="true">
              <b style={{ width: `${cardProgress}%` }} />
            </i>
            <div>
              <span>Эликсир</span>
              <strong>{formatInteger(Math.min(availableElixir, cost.elixirAmount))}/{formatInteger(cost.elixirAmount)}</strong>
            </div>
          </section>
        ) : (
          <section className="boss-card-detail-cost maxed">
            <strong>Максимальный уровень</strong>
          </section>
        )}

        <button className="boss-card-detail-upgrade" disabled={!canUpgrade} onClick={() => props.onUpgrade(props.card.id)} type="button">
          {cost ? "Поднять" : "Макс."}
        </button>
      </article>
    </div>
  );
}

function bossCardName(card: BossCardDefinition | undefined, labels: Record<string, string>): string {
  if (!card) {
    return "Карта";
  }

  return labelFromNameKey(card.nameKey, bossCardFallbackName(card.id), labels);
}

function bossCardDescription(card: BossCardDefinition, labels: Record<string, string>): string {
  return labelFromNameKey(card.descriptionKey, bossCardFallbackDescription(card.id), labels);
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

function bossCardFallbackDescription(cardId: BossCardId): string {
  switch (cardId) {
    case "crit_chance":
      return "Повышает шанс критического удара.";
    case "crit_multiplier":
      return "Увеличивает множитель критического удара.";
    case "hit_damage":
      return "Увеличивает урон босса за тап.";
    case "max_energy":
      return "Увеличивает максимальную энергию босса.";
    default:
      return "Улучшает один из параметров босса.";
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

function bossCardEffectLabel(card: BossCardDefinition): string {
  switch (card.effectType) {
    case "critChance":
      return `+${formatPercent(card.valuePerLevel)}/ур.`;
    case "critMultiplier":
      return `+${formatNumber(card.valuePerLevel)}x/ур.`;
    case "damagePerTap":
      return `+${formatNumber(card.valuePerLevel)} урон/ур.`;
    case "maxEnergy":
      return `+${formatNumber(card.valuePerLevel)} энергия/ур.`;
  }
}

function bossCardValueLabel(card: BossCardDefinition, level: number): string {
  const value = card.valuePerLevel * Math.max(0, level);

  switch (card.effectType) {
    case "critChance":
      return `+${formatPercent(value)}`;
    case "critMultiplier":
      return `+${formatNumber(value)}x`;
    case "damagePerTap":
      return `+${formatNumber(value)} урон`;
    case "maxEnergy":
      return `+${formatNumber(value)} энергии`;
  }
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
