import { Database, FileCheck2, KeyRound, Rocket, ShieldCheck } from "lucide-react";

const cards = [
  {
    title: "Контент",
    description: "Версии, сущности, валидация и публикация конфигов.",
    icon: FileCheck2
  },
  {
    title: "Credentials",
    description: "Ключи внешних сервисов хранятся только в зашифрованном виде.",
    icon: KeyRound
  },
  {
    title: "Миграции",
    description: "PostgreSQL схема ведется через Drizzle и drizzle-kit.",
    icon: Database
  },
  {
    title: "Деплой",
    description: "CI/CD готовится под goblin-cartel.murph.ru.",
    icon: Rocket
  }
];

export function App() {
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <ShieldCheck size={24} />
          <strong>Goblin Admin</strong>
        </div>
        <nav>
          <button className="active" type="button">Dashboard</button>
          <button type="button">Content</button>
          <button type="button">Credentials</button>
          <button type="button">Publishing</button>
        </nav>
      </aside>

      <section className="admin-main">
        <header>
          <div>
            <p>Окружение</p>
            <h1>Панель управления</h1>
          </div>
          <span className="status">Bootstrap готовится</span>
        </header>

        <section className="admin-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="gc-panel admin-card" key={card.title}>
                <Icon size={22} />
                <h2>{card.title}</h2>
                <p>{card.description}</p>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
