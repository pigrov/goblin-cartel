import { LogOut, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import type { AdminSection } from "./adminRoutes";

export function AdminShell(props: {
  activeSection: AdminSection;
  children: ReactNode;
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
  userEmail: string;
}) {
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <ShieldCheck size={24} />
          <strong>Goblin Admin</strong>
        </div>
        <nav>
          <button
            className={props.activeSection === "dashboard" ? "active" : ""}
            onClick={() => props.onNavigate("dashboard")}
            type="button"
          >
            Dashboard
          </button>
          <button
            className={props.activeSection === "content" ? "active" : ""}
            onClick={() => props.onNavigate("content")}
            type="button"
          >
            Content
          </button>
          <button
            className={props.activeSection === "credentials" ? "active" : ""}
            onClick={() => props.onNavigate("credentials")}
            type="button"
          >
            Credentials
          </button>
          <button type="button">Publishing</button>
        </nav>
      </aside>

      <section className="admin-main">
        <header>
          <div>
            <p>Окружение</p>
            <h1>{titleForSection(props.activeSection)}</h1>
          </div>
          <div className="admin-user">
            <span>{props.userEmail}</span>
            <button aria-label="Выйти" onClick={props.onLogout} title="Выйти" type="button">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {props.children}
      </section>
    </main>
  );
}

function titleForSection(section: AdminSection): string {
  switch (section) {
    case "content":
      return "Content";
    case "credentials":
      return "Credentials";
    default:
      return "Панель управления";
  }
}
