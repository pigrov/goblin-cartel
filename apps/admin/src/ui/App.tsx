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

interface CredentialItem {
  id: string;
  name: string;
  type: CredentialType;
  environment: CredentialEnvironment;
  hasValue: true;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

type CredentialType = "api_key" | "oauth" | "smtp" | "storage" | "analytics" | "push" | "json" | "secret";
type CredentialEnvironment = "production" | "staging" | "development";
type AdminSection = "dashboard" | "credentials";

const credentialTypes: Array<{ value: CredentialType; label: string }> = [
  { value: "api_key", label: "API key" },
  { value: "oauth", label: "OAuth" },
  { value: "smtp", label: "SMTP" },
  { value: "storage", label: "Storage" },
  { value: "analytics", label: "Analytics" },
  { value: "push", label: "Push" },
  { value: "json", label: "JSON" },
  { value: "secret", label: "Secret" }
];

const credentialEnvironments: Array<{ value: CredentialEnvironment; label: string }> = [
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" }
];

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
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialName, setCredentialName] = useState("");
  const [credentialType, setCredentialType] = useState<CredentialType>("api_key");
  const [credentialEnvironment, setCredentialEnvironment] = useState<CredentialEnvironment>("production");
  const [credentialValue, setCredentialValue] = useState("");
  const [credentialMessage, setCredentialMessage] = useState<string | null>(null);
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

  useEffect(() => {
    if (!sessionToken || !user || user.mustSetPassword || activeSection !== "credentials") {
      return;
    }

    void loadCredentials();
  }, [activeSection, sessionToken, user]);

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

  async function loadCredentials() {
    if (!sessionToken) {
      return;
    }

    setCredentialsLoading(true);
    setCredentialMessage(null);

    try {
      const response = await apiRequest<{ credentials: CredentialItem[] }>("/admin/credentials", {
        token: sessionToken
      });
      setCredentials(response.credentials);
    } catch (error) {
      setCredentialMessage(error instanceof Error ? error.message : "Не удалось загрузить credentials.");
    } finally {
      setCredentialsLoading(false);
    }
  }

  async function handleCredentialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionToken) {
      clearSession();
      return;
    }

    setBusy(true);
    setCredentialMessage(null);

    try {
      const response = await apiRequest<{ credential: CredentialItem }>("/admin/credentials", {
        method: "POST",
        token: sessionToken,
        body: {
          name: credentialName,
          type: credentialType,
          environment: credentialEnvironment,
          value: credentialValue
        }
      });

      setCredentials((current) =>
        [response.credential, ...current.filter((item) => item.id !== response.credential.id)].sort((left, right) =>
          left.name.localeCompare(right.name)
        )
      );
      setCredentialValue("");
      setCredentialMessage("Credential сохранен. Значение скрыто и хранится зашифрованным.");
    } catch (error) {
      setCredentialMessage(error instanceof Error ? error.message : "Не удалось сохранить credential.");
    } finally {
      setBusy(false);
    }
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
          <button
            className={activeSection === "dashboard" ? "active" : ""}
            onClick={() => setActiveSection("dashboard")}
            type="button"
          >
            Dashboard
          </button>
          <button type="button">Content</button>
          <button
            className={activeSection === "credentials" ? "active" : ""}
            onClick={() => setActiveSection("credentials")}
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
            <h1>{activeSection === "credentials" ? "Credentials" : "Панель управления"}</h1>
          </div>
          <div className="admin-user">
            <span>{user.email}</span>
            <button aria-label="Выйти" onClick={handleLogout} title="Выйти" type="button">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {activeSection === "credentials" ? (
          <CredentialsSection
            busy={busy}
            credentialEnvironment={credentialEnvironment}
            credentialMessage={credentialMessage}
            credentialName={credentialName}
            credentialType={credentialType}
            credentialValue={credentialValue}
            credentials={credentials}
            credentialsLoading={credentialsLoading}
            onCredentialEnvironmentChange={setCredentialEnvironment}
            onCredentialNameChange={setCredentialName}
            onCredentialSubmit={handleCredentialSubmit}
            onCredentialTypeChange={setCredentialType}
            onCredentialValueChange={setCredentialValue}
          />
        ) : (
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
        )}
      </section>
    </main>
  );
}

function CredentialsSection(props: {
  busy: boolean;
  credentialEnvironment: CredentialEnvironment;
  credentialMessage: string | null;
  credentialName: string;
  credentialType: CredentialType;
  credentialValue: string;
  credentials: CredentialItem[];
  credentialsLoading: boolean;
  onCredentialEnvironmentChange: (value: CredentialEnvironment) => void;
  onCredentialNameChange: (value: string) => void;
  onCredentialSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCredentialTypeChange: (value: CredentialType) => void;
  onCredentialValueChange: (value: string) => void;
}) {
  return (
    <section className="credentials-layout">
      <form className="gc-panel credentials-form" onSubmit={props.onCredentialSubmit}>
        <h2>Новый ключ</h2>
        <label>
          Имя
          <input
            onChange={(event) => props.onCredentialNameChange(event.target.value)}
            pattern="[a-z0-9][a-z0-9._-]*"
            placeholder="rustore.api_key"
            required
            type="text"
            value={props.credentialName}
          />
        </label>
        <label>
          Тип
          <select
            onChange={(event) => props.onCredentialTypeChange(event.target.value as CredentialType)}
            value={props.credentialType}
          >
            {credentialTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Окружение
          <select
            onChange={(event) => props.onCredentialEnvironmentChange(event.target.value as CredentialEnvironment)}
            value={props.credentialEnvironment}
          >
            {credentialEnvironments.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Значение
          <textarea
            onChange={(event) => props.onCredentialValueChange(event.target.value)}
            required
            rows={6}
            value={props.credentialValue}
          />
        </label>

        {props.credentialMessage ? <p className="form-message">{props.credentialMessage}</p> : null}

        <button className="primary-action" disabled={props.busy} type="submit">
          {props.busy ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
          Сохранить
        </button>
      </form>

      <section className="credentials-list">
        {props.credentialsLoading ? (
          <article className="gc-panel credentials-empty">
            <Loader2 className="spin" size={22} />
            <span>Загружаем список</span>
          </article>
        ) : props.credentials.length === 0 ? (
          <article className="gc-panel credentials-empty">
            <KeyRound size={22} />
            <span>Ключей пока нет</span>
          </article>
        ) : (
          props.credentials.map((credential) => (
            <article className="gc-panel credential-row" key={credential.id}>
              <div>
                <strong>{credential.name}</strong>
                <span>
                  {credential.type} · {credential.environment}
                </span>
              </div>
              <div className="credential-state">
                <LockKeyhole size={16} />
                <span>{formatDateTime(credential.updatedAt)}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
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
    case "password_setup_required":
      return "Сначала нужно установить пароль.";
    default:
      return "Запрос не прошел.";
  }
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
