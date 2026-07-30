import { Database, FileCheck2, KeyRound, Rocket } from "lucide-react";

const dashboardCards = [
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
    description: "CI/CD работает через GitHub Actions и серверный env.",
    icon: Rocket
  }
];

export function AdminDashboard() {
  return (
    <section className="admin-grid">
      {dashboardCards.map((card) => {
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
  );
}
