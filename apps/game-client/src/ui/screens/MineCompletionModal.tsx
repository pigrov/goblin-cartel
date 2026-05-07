import { Gem, Pickaxe, Route } from "lucide-react";
import type { MineRunCompletionStatsView, MineRunRewardSummary } from "../mineRunStats";
import { GameFullscreenModal } from "../components/GameFullscreenModal";

export function MineCompletionModal(props: {
  currentMineTitle: string;
  nextMineLabel: string;
  onDismiss: () => void;
  onStartNextMine: () => void;
  stats: MineRunCompletionStatsView;
}) {
  return (
    <GameFullscreenModal ariaLabel="Рудник освоен" contentClassName="mine-complete-modal" onClose={props.onDismiss} title="Рудник освоен">
      <header className="mine-modal-heading">
        <span>Рудник освоен</span>
        <strong>{props.currentMineTitle}</strong>
      </header>
      <div className="mine-complete-medal" aria-hidden="true">
        <Pickaxe size={30} />
      </div>
      <div className="mine-complete-stats">
        <div>
          <span>Камни</span>
          <strong>
            {props.stats.destroyedBlocks}/{props.stats.totalBlocks}
          </strong>
        </div>
        <div>
          <span>Глубина</span>
          <strong>{props.stats.depthMeters} м</strong>
        </div>
      </div>
      <div className="mine-complete-summary">
        <div>
          <span>Жила найдена</span>
          <strong>Рудник полностью расчищен</strong>
        </div>
        <div>
          <span>Открыт маршрут</span>
          <strong>{props.nextMineLabel}</strong>
        </div>
      </div>
      <div className="mine-complete-rewards">
        <header>
          <Gem size={17} />
          <span>Итоговая добыча</span>
        </header>
        <RewardPills rewards={props.stats.totalRewards} emptyLabel="Ресурсов за прохождение не было" />
        <div className="mine-complete-reward-breakdown">
          <section>
            <span>Камни</span>
            <RewardPills rewards={props.stats.blockRewards} emptyLabel="-" compact />
          </section>
          <section>
            <span>Глубина</span>
            <RewardPills rewards={props.stats.depthRewards} emptyLabel="-" compact />
          </section>
        </div>
      </div>
      <div className="mine-complete-actions">
        <button onClick={props.onStartNextMine} type="button">
          <Route size={16} />
          Новый рудник
        </button>
        <button onClick={props.onDismiss} type="button">
          Остаться
        </button>
      </div>
    </GameFullscreenModal>
  );
}

function RewardPills(props: {
  compact?: boolean;
  emptyLabel: string;
  rewards: MineRunRewardSummary[];
}) {
  if (props.rewards.length === 0) {
    return <p className="mine-complete-reward-empty">{props.emptyLabel}</p>;
  }

  return (
    <div className={props.compact ? "mine-complete-reward-pills compact" : "mine-complete-reward-pills"}>
      {props.rewards.map((reward) => (
        <span className={`mine-complete-reward-pill ${resourceClassName(reward.resourceId)}`} key={reward.resourceId}>
          <strong>+{formatNumber(reward.amount)}</strong>
          <em>{reward.label}</em>
        </span>
      ))}
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: value >= 100 ? 0 : 1
  }).format(value);
}

function resourceClassName(resourceId: string): string {
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

  return "stone";
}
