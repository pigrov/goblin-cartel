import {
  Database,
  FileCheck2,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Rocket,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

const sessionStorageKey = "goblin-cartel.admin.session-token";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  mustSetPassword: boolean;
}

interface AuthResponse {
  token: string;
  user: AdminUser;
}

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
    description: "CI/CD работает через GitHub Actions и серверный env.",
    icon: Rocket
  }
];

export function App() {
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem(sessionStorageKey));
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<"bootstrap" | "password">("bootstrap");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      if (!sessionToken) {
        setLoadingSession(false);
        return;
      }

      try {
        const response = await apiRequest<{ user: AdminUser }>("/admin/auth/me", {
          token: sessionToken
        });

        if (active) {
          setUser(response.user);
        }
      } catch {
        if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          setLoadingSession(false);
        }
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [sessionToken]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response =
        authMode === "bootstrap"
          ? await apiRequest<AuthResponse>("/admin/auth/bootstrap", {
              method: "POST",
              body: { email }
            })
          : await apiRequest<AuthResponse>("/admin/auth/login", {
              method: "POST",
              body: { email, password }
            });

      setSession(response.token, response.user);
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось войти.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionToken) {
      clearSession();
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await apiRequest<{ user: AdminUser }>("/admin/auth/password", {
        method: "POST",
        token: sessionToken,
        body: { password: newPassword }
      });

      setUser(response.user);
      setNewPassword("");
      setMessage("Пароль установлен. Доступ к админке открыт.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось установить пароль.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (sessionToken) {
      await apiRequest("/admin/auth/logout", {
        method: "POST",
        token: sessionToken
      }).catch(() => undefined);
    }

    clearSession();
  }

  function setSession(token: string, nextUser: AdminUser) {
    localStorage.setItem(sessionStorageKey, token);
    setSessionToken(token);
    setUser(nextUser);
  }

  function clearSession() {
    localStorage.removeItem(sessionStorageKey);
    setSessionToken(null);
    setUser(null);
  }

  if (loadingSession) {
    return (
      <main className="auth-page">
        <section className="gc-panel auth-panel auth-panel-compact">
          <Loader2 className="spin" size={24} />
          <p>Проверяем доступ</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="gc-panel auth-panel">
          <div className="auth-brand">
            <ShieldCheck size={30} />
            <div>
              <p>Goblin Cartel</p>
              <h1>Вход в админку</h1>
            </div>
          </div>

          <div className="auth-switch" role="tablist" aria-label="Способ входа">
            <button
              aria-selected={authMode === "bootstrap"}
              className={authMode === "bootstrap" ? "active" : ""}
              onClick={() => setAuthMode("bootstrap")}
              role="tab"
              type="button"
            >
              <UserPlus size={18} />
              Первый вход
            </button>
            <button
              aria-selected={authMode === "password"}
              className={authMode === "password" ? "active" : ""}
              onClick={() => setAuthMode("password")}
              role="tab"
              type="button"
            >
              <KeyRound size={18} />
              Пароль
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Email
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            {authMode === "password" ? (
              <label>
                Пароль
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
            ) : null}

            {message ? <p className="form-message">{message}</p> : null}

            <button className="primary-action" disabled={busy} type="submit">
              {busy ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={18} />}
              Войти
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (user.mustSetPassword) {
    return (
      <main className="auth-page">
        <section className="gc-panel auth-panel">
          <div className="auth-brand">
            <LockKeyhole size={30} />
            <div>
              <p>{user.email}</p>
              <h1>Установи пароль</h1>
            </div>
          </div>

          <form className="auth-form" onSubmit={handlePasswordSubmit}>
            <label>
              Новый пароль
              <input
                autoComplete="new-password"
                minLength={10}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
            </label>

            {message ? <p className="form-message">{message}</p> : null}

            <button className="primary-action" disabled={busy} type="submit">
              {busy ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
              Сохранить пароль
            </button>
          </form>
        </section>
      </main>
    );
  }

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
          <div className="admin-user">
            <span>{user.email}</span>
            <button aria-label="Выйти" onClick={handleLogout} title="Выйти" type="button">
              <LogOut size={18} />
            </button>
          </div>
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

async function apiRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST";
    token?: string;
    body?: Record<string, unknown>;
  } = {}
): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(messageForApiError((payload as { error?: string }).error));
  }

  return payload as T;
}

function messageForApiError(error?: string): string {
  switch (error) {
    case "bootstrap_email_not_allowed":
      return "Этот email не входит в список bootstrap-доступа.";
    case "password_required":
      return "Для этого email уже нужен вход по паролю.";
    case "invalid_credentials":
      return "Email или пароль не подошли.";
    case "invalid_payload":
      return "Проверь email и пароль.";
    case "invalid_session":
      return "Сессия истекла. Войди заново.";
    default:
      return "Запрос не прошел.";
  }
}
