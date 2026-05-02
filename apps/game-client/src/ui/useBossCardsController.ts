import { type ContentBundle } from "@goblin-cartel/content-schemas";
import {
  applyBossCardBonuses,
  createBossCardDefinitions,
  createInitialBossCardState,
  upgradeBossCard,
  type BossCardDefinition,
  type BossCardId,
  type BossCardState,
  type BossEnergyConfig,
  type MiningSession
} from "@goblin-cartel/game-core";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";

export function useBossCardsController(input: {
  baseBossEnergyConfig: BossEnergyConfig;
  content: ContentBundle;
  labels: Record<string, string>;
  resources: Record<string, number>;
  setSession: Dispatch<SetStateAction<MiningSession>>;
  syncVisibleResourceAmounts: (resources: Record<string, number>) => void;
}) {
  const [bossCards, setBossCards] = useState<BossCardState>(() => createInitialBossCardState());
  const [bossCardsOpen, setBossCardsOpen] = useState(false);
  const [bossCardsMessage, setBossCardsMessage] = useState<string | null>(null);
  const bossCardDefinitions = useMemo(
    () => createBossCardDefinitions(input.content.bossCards),
    [input.content.bossCards]
  );
  const bossEnergyConfig = useMemo(
    () => applyBossCardBonuses(input.baseBossEnergyConfig, bossCards, bossCardDefinitions),
    [bossCardDefinitions, bossCards, input.baseBossEnergyConfig]
  );

  function handleUpgradeBossCard(cardId: BossCardId) {
    const result = upgradeBossCard({
      cardId,
      definitions: bossCardDefinitions,
      resources: input.resources,
      state: bossCards
    });

    if (!result.ok) {
      setBossCardsMessage(messageForBossCardUpgradeFailure(result.reason));
      return;
    }

    const card = bossCardDefinitions.find((definition) => definition.id === cardId);
    setBossCards(result.state);
    input.setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: result.resources
    }));
    input.syncVisibleResourceAmounts(result.resources);
    setBossCardsMessage(`${bossCardName(card, input.labels)} уровень ${result.state.levels[cardId] ?? 0}.`);
  }

  return {
    bossCardDefinitions,
    bossCards,
    bossCardsMessage,
    bossCardsOpen,
    bossEnergyConfig,
    handleUpgradeBossCard,
    setBossCards,
    setBossCardsMessage,
    setBossCardsOpen
  };
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

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

function messageForBossCardUpgradeFailure(reason: string): string {
  switch (reason) {
    case "max_level":
      return "Карта уже на максимальном уровне.";
    case "not_enough_cards":
      return "Не хватает копий карты.";
    case "not_enough_elixir":
      return "Не хватает Эликсира.";
    default:
      return "Карта не улучшена.";
  }
}
