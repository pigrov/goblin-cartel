import { calculateBlockHp } from "@goblin-cartel/game-core";
import { Bot, Hammer, Pickaxe, Settings, Users, Warehouse } from "lucide-react";

const resources = [
  { label: "Золото", value: "1 240", className: "gold" },
  { label: "Камень", value: "380", className: "stone" },
  { label: "Медь", value: "74", className: "copper" },
  { label: "Энергия", value: "70/100", className: "energy" }
];

const blocks = Array.from({ length: 56 }, (_, index) => {
  const row = Math.floor(index / 8);
  const hp = calculateBlockHp({
    baseHp: row > 4 ? 80 : 40,
    rowIndex: row,
    mineDifficultyMultiplier: 1
  });

  return {
    id: index,
    hp,
    kind: index % 13 === 0 ? "gold" : index % 7 === 0 ? "copper" : row > 3 ? "stone" : "dirt"
  };
});

export function App() {
  return (
    <main className="game-shell">
      <section className="phone-frame" aria-label="Игровой экран">
        <header className="resource-bar">
          {resources.map((resource) => (
            <div className={`resource-chip ${resource.className}`} key={resource.label}>
              <span>{resource.label}</span>
              <strong>{resource.value}</strong>
            </div>
          ))}
        </header>

        <section className="mine-header">
          <div>
            <p>Старый колодец</p>
            <strong>Глубина 24 м</strong>
          </div>
          <button className="icon-button" type="button" aria-label="Настройки">
            <Settings size={19} />
          </button>
        </section>

        <section className="goblin-platform" aria-label="Бригада">
          <div className="goblin">Грызз</div>
          <div className="goblin">Мык</div>
          <div className="goblin locked">Пип</div>
        </section>

        <section className="mine-grid" aria-label="Рудник">
          {blocks.map((block) => (
            <button className={`mine-block ${block.kind}`} key={block.id} type="button">
              <span>{block.hp}</span>
            </button>
          ))}
        </section>

        <section className="boss-panel">
          <button className="boss-button" type="button">
            <Hammer size={20} />
            Удар босса
          </button>
          <div className="energy-meter">
            <span />
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
