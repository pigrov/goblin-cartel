import { AlertTriangle, Medal, RefreshCw, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchPlayerDbLeaderboard, type PlayerDbLeaderboardEntry } from "../playerDbSaveClient";

interface LeaderboardMetric {
  key: string;
  label: string;
  unit: string;
}

const leaderboardMetrics: LeaderboardMetric[] = [
  {
    key: "mine.max_depth_meters",
    label: "Глубина",
    unit: "м"
  },
  {
    key: "mine.current_destroyed_blocks",
    label: "Блоки",
    unit: ""
  },
  {
    key: "built_mines.total_count",
    label: "Шахты",
    unit: ""
  },
  {
    key: "goblins.hired_count",
    label: "Гоблины",
    unit: ""
  },
  {
    key: "resources.wallet_total",
    label: "Кошелёк",
    unit: ""
  }
];
const defaultLeaderboardMetric = leaderboardMetrics[0] as LeaderboardMetric;

export function LeaderboardSection() {
  const [activeMetricKey, setActiveMetricKey] = useState(defaultLeaderboardMetric.key);
  const [entries, setEntries] = useState<PlayerDbLeaderboardEntry[]>([]);
  const [status, setStatus] = useState<"error" | "idle" | "loading" | "ready">("idle");
  const [reloadToken, setReloadToken] = useState(0);
  const activeMetric = useMemo(
    () => leaderboardMetrics.find((metric) => metric.key === activeMetricKey) ?? defaultLeaderboardMetric,
    [activeMetricKey]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      setStatus("loading");
      const result = await fetchPlayerDbLeaderboard({
        limit: 20,
        scoreKey: activeMetric.key
      });

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setEntries([]);
        setStatus("error");
        return;
      }

      setEntries(result.leaderboard);
      setStatus("ready");
    }

    void loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [activeMetric, reloadToken]);

  return (
    <section className="leaderboard-screen management-screen" aria-label="Рейтинг">
      <header className="section-title management-title">
        <div>
          <p>Рейтинг</p>
          <strong>{activeMetric?.label ?? "Лучшие игроки"}</strong>
        </div>
        <button
          aria-label="Обновить рейтинг"
          className="leaderboard-refresh"
          disabled={status === "loading"}
          onClick={() => setReloadToken((current) => current + 1)}
          type="button"
        >
          <RefreshCw size={17} />
        </button>
      </header>

      <div className="leaderboard-tabs" aria-label="Метрика рейтинга">
        {leaderboardMetrics.map((metric) => (
          <button
            className={metric.key === activeMetricKey ? "active" : ""}
            key={metric.key}
            onClick={() => setActiveMetricKey(metric.key)}
            type="button"
          >
            {metric.label}
          </button>
        ))}
      </div>

      <div className="leaderboard-list">
        {status === "loading" ? <LeaderboardState icon="trophy" title="Загружаем рейтинг" /> : null}
        {status === "error" ? <LeaderboardState icon="error" title="Рейтинг временно недоступен" /> : null}
        {status === "ready" && entries.length === 0 ? <LeaderboardState icon="trophy" title="Пока нет результатов" /> : null}

        {status === "ready"
          ? entries.map((entry) => <LeaderboardRow entry={entry} key={`${entry.key}:${entry.seasonId}:${entry.playerId}`} metric={activeMetric} />)
          : null}
      </div>
    </section>
  );
}

function LeaderboardRow(props: {
  entry: PlayerDbLeaderboardEntry;
  metric: LeaderboardMetric;
}) {
  return (
    <article className={`leaderboard-row ${props.entry.rank <= 3 ? `rank-${props.entry.rank}` : ""}`}>
      <span className="leaderboard-rank">{props.entry.rank <= 3 ? <Medal size={17} /> : props.entry.rank}</span>
      <div>
        <strong>{props.entry.displayName ?? playerFallbackName(props.entry.playerId)}</strong>
        <span>{scoreKeyLabel(props.entry.key)}</span>
      </div>
      <strong className="leaderboard-score">{formatLeaderboardValue(props.entry.value, props.metric.unit)}</strong>
    </article>
  );
}

function LeaderboardState(props: { icon: "error" | "trophy"; title: string }) {
  return (
    <div className="leaderboard-state">
      {props.icon === "error" ? <AlertTriangle size={24} /> : <Trophy size={24} />}
      <strong>{props.title}</strong>
    </div>
  );
}

function playerFallbackName(playerId: string): string {
  return `Игрок ${playerId.slice(0, 6)}`;
}

function scoreKeyLabel(scoreKey: string): string {
  return leaderboardMetrics.find((metric) => metric.key === scoreKey)?.label ?? scoreKey;
}

function formatLeaderboardValue(value: number, unit: string): string {
  const formatted = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(value);

  return unit ? `${formatted} ${unit}` : formatted;
}
