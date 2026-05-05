import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileCheck2,
  FileJson,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  PlusCircle,
  Rocket,
  Send,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

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

interface AssetUploadResponse {
  asset: {
    assetId: string;
    fileName: string;
    mimeType: string;
    size: number;
    updatedAt: string;
    url: string;
  };
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
type AdminSection = "dashboard" | "content" | "credentials";
type ContentEntityKind =
  | "blockTypes"
  | "bossCards"
  | "builtMineTypes"
  | "elevator"
  | "goblinGeneration"
  | "goblinHut"
  | "mineTemplates"
  | "rewardChestTypes";
type ContentEntityApiKind =
  | "blockType"
  | "bossCard"
  | "builtMineType"
  | "elevator"
  | "goblinGeneration"
  | "goblinHut"
  | "mineTemplate"
  | "rewardChestType";
type EntityFormState = Record<string, string>;

interface ContentVersion {
  id: string;
  version: string;
  status: "draft" | "validated" | "published" | "archived" | string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

type ContentRecord = Record<string, unknown>;

interface ContentBundle {
  resources: ContentRecord[];
  blockTypes: ContentRecord[];
  veinTypes?: ContentRecord[];
  builtMineTypes?: ContentRecord[];
  rewardChestTypes?: ContentRecord[];
  bossCards?: ContentRecord[];
  mineTemplates: ContentRecord[];
  goblinGeneration?: ContentRecord;
  goblinHut: ContentRecord;
  elevator: ContentRecord;
  localization?: Record<string, Record<string, string>>;
}

interface FormValidation {
  errors: string[];
  ok: boolean;
}

interface EntityDraftUpdate {
  entity: ContentRecord;
  entityId: string;
  entityType: ContentEntityApiKind;
  localization: Record<string, string>;
  message: string;
}

interface DraftContentToolResult {
  content: ContentBundle;
  entity: ContentRecord;
  entityId?: string;
  entityKind?: ContentEntityKind;
  entityType: ContentEntityApiKind;
  localization: Record<string, string>;
  message: string;
}

interface MineVisualCell {
  blockTypeId: string;
  col: number;
  hp: string;
  rewardChestTypeId: string;
  row: number;
  special: string;
}

interface MineVisualRow {
  cells: MineVisualCell[];
  row: number;
}

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

const contentEntityKindOptions: Array<{ label: string; value: ContentEntityKind }> = [
  { value: "blockTypes", label: "Блоки" },
  { value: "goblinGeneration", label: "Генерация" },
  { value: "goblinHut", label: "Хижина" },
  { value: "elevator", label: "Подъемник" },
  { value: "mineTemplates", label: "Рудники" },
  { value: "builtMineTypes", label: "Типы шахт" },
  { value: "rewardChestTypes", label: "Сундуки" },
  { value: "bossCards", label: "Карты босса" }
];
const upgradeCostProductionResourceValue = "__production_resource__";

const goblinClassOptions = [
  { value: "miner", label: "Шахтер" },
  { value: "builder", label: "Строитель" },
  { value: "collector", label: "Сборщик" },
  { value: "foreman", label: "Бригадир" }
];

const goblinSpecializationOptions = [
  { value: "", label: "Без специализации" },
  { value: "stonebreaker", label: "Камнелом" },
  { value: "ore_sniffer", label: "Рудный нюх" },
  { value: "heavy_striker", label: "Тяжеловес" },
  { value: "warehouse_keeper", label: "Кладовщик" },
  { value: "resource_expert", label: "Рудный эксперт" },
  { value: "construction_foreman", label: "Бригадир стройки" },
  { value: "event", label: "Event" }
];

const rarityOptions = [
  { value: "common", label: "Common" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "legendary", label: "Legendary" }
];

const specialBehaviorOptions = [
  { value: "none", label: "None" },
  { value: "explosion", label: "Explosion" }
];

const rewardChestTierOptions = [
  { value: "wooden", label: "Wooden" },
  { value: "iron", label: "Iron" },
  { value: "steel", label: "Steel" },
  { value: "golden", label: "Golden" }
];

const bossCardRarityOptions = [
  { value: "common", label: "Обычная" },
  { value: "rare", label: "Редкая" },
  { value: "golden", label: "Золотая" }
];

const bossCardDropRarityBalanceOptions = [
  { value: "common", label: "Обычные карты" },
  { value: "rare", label: "Редкие карты" },
  { value: "golden", label: "Золотые карты" }
] as const;

const bossCardEffectOptions = [
  { value: "damagePerTap", label: "Урон за тап" },
  { value: "critChance", label: "Шанс крита" },
  { value: "critMultiplier", label: "Сила крита" },
  { value: "maxEnergy", label: "Запас энергии" }
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
  const initialRoute = readAdminRoute();
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem(sessionStorageKey));
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<"bootstrap" | "password">("bootstrap");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [activeSection, setActiveSection] = useState<AdminSection>(initialRoute.section);
  const [contentVersionSlug, setContentVersionSlug] = useState<string | null>(initialRoute.contentVersionSlug);
  const [contentVersions, setContentVersions] = useState<ContentVersion[]>([]);
  const [selectedContentVersion, setSelectedContentVersion] = useState<ContentVersion | null>(null);
  const [contentVersionName, setContentVersionName] = useState("");
  const [contentNotes, setContentNotes] = useState("");
  const [contentJson, setContentJson] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const [contentMessage, setContentMessage] = useState<string | null>(null);
  const [contentErrors, setContentErrors] = useState<string[]>([]);
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
    function handlePopState() {
      const route = readAdminRoute();
      setActiveSection(route.section);
      setContentVersionSlug(route.contentVersionSlug);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

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

  useEffect(() => {
    if (!sessionToken || !user || user.mustSetPassword || activeSection !== "content") {
      return;
    }

    void loadContentVersions();
  }, [activeSection, contentVersionSlug, sessionToken, user]);

  useEffect(() => {
    if (activeSection === "content" && !contentVersionSlug) {
      setContentJson("");
      setContentErrors([]);
      setSelectedContentVersion(null);
    }
  }, [activeSection, contentVersionSlug]);

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

  async function loadContentVersions() {
    if (!sessionToken) {
      return;
    }

    setContentLoading(true);
    setContentMessage(null);

    try {
      const response = await apiRequest<{ versions: ContentVersion[] }>("/admin/content/versions", {
        token: sessionToken
      });
      setContentVersions(response.versions);

      if (contentVersionSlug) {
        const versionFromRoute = response.versions.find(
          (version) => version.version === contentVersionSlug || version.id === contentVersionSlug
        );

        if (versionFromRoute) {
          if (selectedContentVersion?.id !== versionFromRoute.id || !contentJson) {
            await loadContentVersion(versionFromRoute.id);
          }
        } else {
          setContentJson("");
          setContentErrors([]);
          setSelectedContentVersion(null);
          setContentMessage(`Версия ${contentVersionSlug} не найдена.`);
        }
      }
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "Не удалось загрузить версии контента.");
    } finally {
      setContentLoading(false);
    }
  }

  async function loadContentVersion(id: string) {
    if (!sessionToken) {
      return;
    }

    setContentLoading(true);
    setContentMessage(null);
    setContentErrors([]);

    try {
      const response = await apiRequest<{ version: ContentVersion; content: ContentBundle }>(
        `/admin/content/versions/${id}`,
        {
          token: sessionToken
        }
      );
      setSelectedContentVersion(response.version);
      setContentJson(JSON.stringify(response.content, null, 2));
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "Не удалось загрузить версию контента.");
    } finally {
      setContentLoading(false);
    }
  }

  async function handleCreateContentVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionToken) {
      clearSession();
      return;
    }

    setBusy(true);
    setContentMessage(null);
    setContentErrors([]);

    try {
      const response = await apiRequest<{ version: ContentVersion; content: ContentBundle }>("/admin/content/versions", {
        method: "POST",
        token: sessionToken,
        body: {
          version: contentVersionName,
          notes: contentNotes || undefined
        }
      });
      setContentVersions((current) => [response.version, ...current]);
      setSelectedContentVersion(response.version);
      setContentJson(JSON.stringify(response.content, null, 2));
      setContentVersionName("");
      setContentNotes("");
      setContentMessage("Draft-версия создана со стартовым контентом.");
      navigateToContentVersion(response.version);
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "Не удалось создать версию.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveContentEntity(update: EntityDraftUpdate) {
    if (!sessionToken || !selectedContentVersion) {
      return;
    }

    setBusy(true);
    setContentMessage(null);
    setContentErrors([]);

    try {
      const response = await apiRequest<{ version: ContentVersion; content: ContentBundle }>(
        `/admin/content/versions/${selectedContentVersion.id}/entities/${update.entityType}/${encodeURIComponent(update.entityId)}`,
        {
          method: "PUT",
          token: sessionToken,
          body: {
            entity: update.entity,
            localization: update.localization
          }
        }
      );
      setSelectedContentVersion(response.version);
      setContentVersions((current) => replaceContentVersion(current, response.version));
      setContentJson(JSON.stringify(response.content, null, 2));
      setContentMessage(update.message);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setContentErrors(error.validationErrors);
      }
      setContentMessage(error instanceof Error ? error.message : "Не удалось сохранить сущность.");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function handleValidateContent() {
    if (!sessionToken || !selectedContentVersion) {
      return;
    }

    setBusy(true);
    setContentMessage(null);
    setContentErrors([]);

    try {
      const response = await apiRequest<{
        version: ContentVersion;
        validation: { ok: boolean; errors: string[] };
      }>(`/admin/content/versions/${selectedContentVersion.id}/validate`, {
        method: "POST",
        token: sessionToken
      });
      setSelectedContentVersion(response.version);
      setContentVersions((current) => replaceContentVersion(current, response.version));
      setContentErrors(response.validation.errors);
      setContentMessage(response.validation.ok ? "Валидация пройдена." : "Валидация нашла ошибки.");
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "Не удалось проверить контент.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishContent() {
    if (!sessionToken || !selectedContentVersion) {
      return;
    }

    setBusy(true);
    setContentMessage(null);
    setContentErrors([]);

    try {
      const response = await apiRequest<{
        version: ContentVersion;
        validation: { ok: boolean; errors: string[] };
      }>(`/admin/content/versions/${selectedContentVersion.id}/publish`, {
        method: "POST",
        token: sessionToken
      });
      setSelectedContentVersion(response.version);
      setContentVersions((current) =>
        replaceContentVersion(
          current.map((version) =>
            version.status === "published" && version.id !== response.version.id
              ? { ...version, status: "archived" }
              : version
          ),
          response.version
        )
      );
      setContentErrors(response.validation.errors);
      setContentMessage(response.validation.ok ? "Версия опубликована." : "Публикация остановлена из-за ошибок.");
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "Не удалось опубликовать контент.");
    } finally {
      setBusy(false);
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

  function navigateToSection(section: AdminSection) {
    const nextPath = adminSectionPath(section);
    window.history.pushState(null, "", nextPath);
    setActiveSection(section);
    setContentVersionSlug(null);
  }

  function navigateToContentList() {
    window.history.pushState(null, "", adminSectionPath("content"));
    setActiveSection("content");
    setContentVersionSlug(null);
  }

  function navigateToContentVersion(version: ContentVersion) {
    window.history.pushState(null, "", adminContentVersionPath(version.version));
    setActiveSection("content");
    setContentVersionSlug(version.version);
  }

  function handleSelectContentVersion(id: string) {
    const version = contentVersions.find((item) => item.id === id);

    if (version) {
      navigateToContentVersion(version);
      return;
    }

    void loadContentVersion(id);
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
            onClick={() => navigateToSection("dashboard")}
            type="button"
          >
            Dashboard
          </button>
          <button
            className={activeSection === "content" ? "active" : ""}
            onClick={() => navigateToSection("content")}
            type="button"
          >
            Content
          </button>
          <button
            className={activeSection === "credentials" ? "active" : ""}
            onClick={() => navigateToSection("credentials")}
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
            <h1>{titleForSection(activeSection)}</h1>
          </div>
          <div className="admin-user">
            <span>{user.email}</span>
            <button aria-label="Выйти" onClick={handleLogout} title="Выйти" type="button">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {activeSection === "content" ? (
          <ContentSection
            busy={busy}
            contentErrors={contentErrors}
            contentJson={contentJson}
            contentLoading={contentLoading}
            contentMessage={contentMessage}
            contentNotes={contentNotes}
            contentVersionName={contentVersionName}
            contentVersions={contentVersions}
            onContentNotesChange={setContentNotes}
            onContentVersionNameChange={setContentVersionName}
            onCreateContentVersion={handleCreateContentVersion}
            onOpenContentList={navigateToContentList}
            onPublishContent={handlePublishContent}
            onSaveContentEntity={handleSaveContentEntity}
            onSelectContentVersion={handleSelectContentVersion}
            onValidateContent={handleValidateContent}
            selectedContentVersion={selectedContentVersion}
            sessionToken={sessionToken}
          />
        ) : activeSection === "credentials" ? (
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

function ContentSection(props: {
  busy: boolean;
  contentErrors: string[];
  contentJson: string;
  contentLoading: boolean;
  contentMessage: string | null;
  contentNotes: string;
  contentVersionName: string;
  contentVersions: ContentVersion[];
  onContentNotesChange: (value: string) => void;
  onContentVersionNameChange: (value: string) => void;
  onCreateContentVersion: (event: FormEvent<HTMLFormElement>) => void;
  onOpenContentList: () => void;
  onPublishContent: () => void;
  onSaveContentEntity: (update: EntityDraftUpdate) => Promise<void>;
  onSelectContentVersion: (id: string) => void;
  onValidateContent: () => void;
  selectedContentVersion: ContentVersion | null;
  sessionToken: string | null;
}) {
  const [draftToolMessage, setDraftToolMessage] = useState<string | null>(null);
  const [entityEditorKind, setEntityEditorKind] = useState<ContentEntityKind>("goblinGeneration");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [showRawJson, setShowRawJson] = useState(false);
  const contentPreview = useMemo(() => parseContentPreview(props.contentJson), [props.contentJson]);
  const canEdit =
    props.selectedContentVersion?.status === "draft" || props.selectedContentVersion?.status === "validated";
  const selectedEntityItems = contentPreview ? getContentEntityItems(contentPreview, entityEditorKind) : [];

  useEffect(() => {
    if (selectedEntityItems.length === 0) {
      if (selectedEntityId) {
        setSelectedEntityId("");
      }
      return;
    }

    const firstEntity = selectedEntityItems[0];

    if (firstEntity && !selectedEntityItems.some((item) => stringField(item, "id") === selectedEntityId)) {
      setSelectedEntityId(stringField(firstEntity, "id"));
    }
  }, [selectedEntityId, selectedEntityItems]);

  useEffect(() => {
    setShowRawJson(false);
  }, [props.selectedContentVersion?.id]);

  async function applyDraftTool(builder: (content: ContentBundle) => DraftContentToolResult) {
    if (!canEdit || !props.selectedContentVersion) {
      return;
    }

    if (!contentPreview) {
      setDraftToolMessage("JSON сейчас не читается, сначала поправь синтаксис.");
      return;
    }

    try {
      const result = builder(contentPreview);
      if (!result.entityId) {
        throw new Error("Шаблон не вернул id сущности.");
      }
      await props.onSaveContentEntity({
        entity: result.entity,
        entityId: result.entityId,
        entityType: result.entityType,
        localization: result.localization,
        message: result.message
      });
      if (result.entityKind) {
        setEntityEditorKind(result.entityKind);
      }
      if (result.entityId) {
        setSelectedEntityId(result.entityId);
      }
      setDraftToolMessage(result.message);
    } catch (error) {
      setDraftToolMessage(error instanceof Error ? error.message : "Не удалось создать шаблон.");
    }
  }

  async function handleSaveEntityEdit(update: EntityDraftUpdate) {
    setDraftToolMessage(null);

    try {
      await props.onSaveContentEntity(update);
      setDraftToolMessage(update.message);
    } catch (error) {
      setDraftToolMessage(error instanceof Error ? error.message : "Не удалось сохранить сущность.");
    }
  }

  const createVersionForm = (
    <form className="content-create-form" onSubmit={props.onCreateContentVersion}>
      <label>
        Version
        <input
          onChange={(event) => props.onContentVersionNameChange(event.target.value)}
          placeholder="0.1.0"
          required
          type="text"
          value={props.contentVersionName}
        />
      </label>
      <label>
        Notes
        <textarea
          onChange={(event) => props.onContentNotesChange(event.target.value)}
          rows={3}
          value={props.contentNotes}
        />
      </label>
      <button className="primary-action" disabled={props.busy} type="submit">
        {props.busy ? <Loader2 className="spin" size={18} /> : <FileJson size={18} />}
        Создать draft
      </button>
    </form>
  );

  if (!props.selectedContentVersion) {
    return (
      <section className="content-home">
        <section className="gc-panel content-create content-create-home">
          <header>
            <div>
              <strong>Новая версия</strong>
              <span>Создай draft или выбери уже существующую версию ниже.</span>
            </div>
          </header>
          {createVersionForm}
        </section>

        <section className="content-version-home-list">
          {props.contentLoading ? (
            <article className="gc-panel content-empty">
              <Loader2 className="spin" size={20} />
              <span>Загружаем версии</span>
            </article>
          ) : props.contentVersions.length === 0 ? (
            <article className="gc-panel content-empty">
              <FileJson size={20} />
              <span>Версий пока нет</span>
            </article>
          ) : (
            props.contentVersions.map((version) => (
              <button
                className="gc-panel content-version-card"
                key={version.id}
                onClick={() => props.onSelectContentVersion(version.id)}
                type="button"
              >
                <div>
                  <strong>{version.version}</strong>
                  <span>{version.notes || "Без заметки"}</span>
                </div>
                <div>
                  <span>{version.status}</span>
                  <small>{formatDateTime(version.updatedAt)}</small>
                </div>
              </button>
            ))
          )}
        </section>

        {props.contentMessage ? <p className="form-message">{props.contentMessage}</p> : null}
      </section>
    );
  }

  return (
    <section className="content-editor content-editor-full">
      <div className="gc-panel content-toolbar">
        <div className="content-toolbar-title">
          <button onClick={props.onOpenContentList} type="button">
            Версии
          </button>
          <div>
            <strong>{props.selectedContentVersion?.version ?? "Версия не выбрана"}</strong>
            <span>{props.selectedContentVersion ? formatDateTime(props.selectedContentVersion.updatedAt) : ""}</span>
          </div>
        </div>
          <div className="content-actions">
            <button disabled={!canEdit || props.busy} onClick={props.onValidateContent} type="button">
              <CheckCircle2 size={17} />
              Validate
            </button>
            <button disabled={!canEdit || props.busy} onClick={props.onPublishContent} type="button">
              <Send size={17} />
              Publish
            </button>
          </div>
      </div>

        {props.selectedContentVersion && !canEdit ? (
          <p className="content-tool-message">Эта версия доступна только для просмотра. Создай новый draft, чтобы менять контент.</p>
        ) : null}

        <section className="gc-panel content-entity-tools">
          <header>
            <div>
              <strong>Сущности контента</strong>
              <span>{contentPreview ? "Формы сохраняют draft через серверную проверку" : "JSON пока не разобран"}</span>
            </div>
            <div className="content-template-actions">
              <button
                disabled={!canEdit || !props.selectedContentVersion}
                onClick={() => void applyDraftTool(addDraftBlockTypeTemplate)}
                type="button"
              >
                <PlusCircle size={16} />
                Блок
              </button>
              <button
                disabled={!canEdit || !props.selectedContentVersion}
                onClick={() => void applyDraftTool(addDraftMineTemplate)}
                type="button"
              >
                <PlusCircle size={16} />
                Рудник
              </button>
              <button
                disabled={!canEdit || !props.selectedContentVersion}
                onClick={() => void applyDraftTool(addDraftBuiltMineTypeTemplate)}
                type="button"
              >
                <PlusCircle size={16} />
                Тип шахты
              </button>
              <button
                disabled={!canEdit || !props.selectedContentVersion}
                onClick={() => void applyDraftTool(addDraftRewardChestTypeTemplate)}
                type="button"
              >
                <PlusCircle size={16} />
                Сундук
              </button>
              <button
                disabled={!canEdit || !props.selectedContentVersion}
                onClick={() => void applyDraftTool(addDraftBossCardTemplate)}
                type="button"
              >
                <PlusCircle size={16} />
                Карта
              </button>
              <button
                className={showRawJson ? "active" : ""}
                disabled={!props.selectedContentVersion}
                onClick={() => setShowRawJson((current) => !current)}
                type="button"
              >
                JSON
              </button>
            </div>
          </header>

          <div className="content-entity-kpis" aria-label="Счетчики сущностей">
            <ContentEntityKpi label="Ресурсы" value={contentEntityCount(contentPreview, "resources")} />
            <ContentEntityKpi label="Блоки" value={contentEntityCount(contentPreview, "blockTypes")} />
            <ContentEntityKpi label="Жилы" value={contentEntityCount(contentPreview, "veinTypes")} />
            <ContentEntityKpi label="Типы шахт" value={contentEntityCount(contentPreview, "builtMineTypes")} />
            <ContentEntityKpi label="Рудники" value={contentEntityCount(contentPreview, "mineTemplates")} />
            <ContentEntityKpi label="Карты" value={contentEntityCount(contentPreview, "bossCards")} />
            <ContentEntityKpi label="Генерация" value={contentPreview?.goblinGeneration ? 1 : 0} />
            <ContentEntityKpi label="Хижина" value={contentPreview?.goblinHut ? 1 : 0} />
            <ContentEntityKpi label="Подъемник" value={contentPreview?.elevator ? 1 : 0} />
          </div>

          {contentPreview ? (
            <ContentEntityEditor
              busy={props.busy}
              canEdit={canEdit && Boolean(props.selectedContentVersion)}
              content={contentPreview}
              kind={entityEditorKind}
              onApply={handleSaveEntityEdit}
              onKindChange={setEntityEditorKind}
              onSelectedIdChange={setSelectedEntityId}
              selectedId={selectedEntityId}
              sessionToken={props.sessionToken}
            />
          ) : null}

          {contentPreview ? <ContentEntityPreview content={contentPreview} /> : null}
          {draftToolMessage ? <p className="content-tool-message">{draftToolMessage}</p> : null}
        </section>

        {showRawJson ? (
          <textarea
            className="content-json"
            readOnly
            spellCheck={false}
            value={props.contentJson}
          />
        ) : null}

        {props.contentMessage ? <p className="form-message">{props.contentMessage}</p> : null}

        {props.contentErrors.length > 0 ? (
          <section className="gc-panel content-errors">
            <AlertTriangle size={18} />
            <div>
              {props.contentErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          </section>
        ) : null}
    </section>
  );
}

function ContentEntityEditor(props: {
  busy: boolean;
  canEdit: boolean;
  content: ContentBundle;
  kind: ContentEntityKind;
  onApply: (update: EntityDraftUpdate) => void | Promise<void>;
  onKindChange: (kind: ContentEntityKind) => void;
  onSelectedIdChange: (id: string) => void;
  selectedId: string;
  sessionToken: string | null;
}) {
  const items = getContentEntityItems(props.content, props.kind);
  const selectedEntity = items.find((item) => stringField(item, "id") === props.selectedId) ?? items[0] ?? null;
  const [formState, setFormState] = useState<EntityFormState>(() =>
    selectedEntity ? createEntityFormState(props.kind, selectedEntity, props.content) : {}
  );

  useEffect(() => {
    setFormState(selectedEntity ? createEntityFormState(props.kind, selectedEntity, props.content) : {});
  }, [props.content, props.kind, selectedEntity]);

  const validation = useMemo(
    () => (selectedEntity ? validateEntityForm(props.kind, formState, props.content, props.selectedId) : { ok: false, errors: ["Сущность не выбрана."] }),
    [formState, props.content, props.kind, props.selectedId, selectedEntity]
  );

  function updateField(field: string, value: string) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateFields(values: EntityFormState) {
    setFormState((current) => ({
      ...current,
      ...values
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEntity || !validation.ok) {
      return;
    }

    void props.onApply(applyEntityForm(props.content, props.kind, props.selectedId, formState));
  }

  return (
    <section className="content-entity-editor">
      <div className="content-entity-tabs" role="tablist" aria-label="Тип сущности">
        {contentEntityKindOptions.map((option) => (
          <button
            aria-selected={props.kind === option.value}
            className={props.kind === option.value ? "active" : ""}
            key={option.value}
            onClick={() => props.onKindChange(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="content-entity-editor-body">
        <aside className="content-entity-picker" aria-label="Список сущностей">
          {items.length > 0 ? (
            items.map((item) => {
              const id = stringField(item, "id");

              return (
                <button className={id === props.selectedId ? "active" : ""} key={id} onClick={() => props.onSelectedIdChange(id)} type="button">
                  <strong>{contentEntityTitle(item, props.content.localization?.ru ?? {})}</strong>
                  <span>{id}</span>
                </button>
              );
            })
          ) : (
            <p>Сущностей пока нет</p>
          )}
        </aside>

        <form className="content-entity-form" onSubmit={handleSubmit}>
          {selectedEntity ? (
            renderEntityFields(props.kind, formState, props.content, updateField, updateFields, props.sessionToken)
          ) : (
            <p className="content-tool-message">Выбери или создай сущность.</p>
          )}

          {validation.errors.length > 0 ? (
            <div className="content-entity-validation">
              {validation.errors.map((error) => (
                <span key={error}>{error}</span>
              ))}
            </div>
          ) : null}

          <button disabled={!props.canEdit || props.busy || !selectedEntity || !validation.ok} type="submit">
            {props.busy ? <Loader2 className="spin" size={16} /> : null}
            Сохранить draft
          </button>
        </form>
      </div>
    </section>
  );
}

function renderEntityFields(
  kind: ContentEntityKind,
  formState: EntityFormState,
  content: ContentBundle,
  updateField: (field: string, value: string) => void,
  updateFields: (values: EntityFormState) => void,
  sessionToken: string | null
) {
  if (kind === "blockTypes") {
    return (
      <>
        <ContentTextField disabled label="ID" name="id" onChange={updateField} value={formState.id} />
        <ContentTextField label="Название RU" name="title" onChange={updateField} value={formState.title} />
        <div className="content-form-grid">
          <ContentTextField label="HP" name="baseHp" onChange={updateField} type="number" value={formState.baseHp} />
          <ContentSelectField
            label="Особое поведение"
            name="specialBehavior"
            onChange={updateField}
            options={specialBehaviorOptions}
            value={formState.specialBehavior}
          />
        </div>
        <ContentTextField label="Теги через запятую" name="tags" onChange={updateField} value={formState.tags} />
        <div className="content-form-grid">
          <ContentTextField label="Asset intact" name="assetIntact" onChange={updateField} value={formState.assetIntact} />
          <ContentTextField label="Asset cracked" name="assetCracked" onChange={updateField} value={formState.assetCracked} />
          <ContentTextField label="Asset breaking" name="assetBreaking" onChange={updateField} value={formState.assetBreaking} />
        </div>
        <ContentRewardRows content={content} formState={formState} prefix="reward" updateField={updateField} updateFields={updateFields} />
      </>
    );
  }

  if (kind === "goblinHut") {
    return (
      <>
        <ContentTextField disabled label="ID" name="id" onChange={updateField} value={formState.id} />
        <ContentTextField label="Название RU" name="title" onChange={updateField} value={formState.title} />
        <ContentGoblinHutLevelRows content={content} formState={formState} updateField={updateField} updateFields={updateFields} />
      </>
    );
  }

  if (kind === "goblinGeneration") {
    return (
      <>
        <ContentTextField disabled label="ID" name="id" onChange={updateField} value={formState.id} />
        <ContentTextField label="Название RU" name="title" onChange={updateField} value={formState.title} />
        <ContentTextAreaField
          label="Имена, по одному на строку"
          name="namePoolNames"
          onChange={updateField}
          value={formState.namePoolNames}
        />
        <ContentTextAreaField
          label="Прозвища, по одному на строку"
          name="namePoolNicknames"
          onChange={updateField}
          value={formState.namePoolNicknames}
        />
        <ContentGoblinGenerationArchetypeRows
          content={content}
          formState={formState}
          sessionToken={sessionToken}
          updateFields={updateFields}
        />
        <ContentTextAreaField
          label="Архетипы найма JSON"
          name="archetypesJson"
          onChange={updateField}
          value={formState.archetypesJson}
        />
      </>
    );
  }

  if (kind === "elevator") {
    return (
      <>
        <ContentTextField disabled label="ID" name="id" onChange={updateField} value={formState.id} />
        <ContentTextField label="Название RU" name="title" onChange={updateField} value={formState.title} />
        <ContentElevatorLevelRows formState={formState} updateField={updateField} updateFields={updateFields} />
      </>
    );
  }

  if (kind === "mineTemplates") {
    return (
      <>
        <ContentTextField disabled label="ID" name="id" onChange={updateField} value={formState.id} />
        <ContentTextField label="Название RU" name="title" onChange={updateField} value={formState.title} />
        <div className="content-form-grid">
          <ContentTextField label="Ширина" name="width" onChange={updateField} type="number" value={formState.width} />
          <ContentTextField label="Высота, рядов" name="height" onChange={updateField} type="number" value={formState.height} />
          <ContentTextField label="Глубина, м" name="depthMeters" onChange={updateField} type="number" value={formState.depthMeters} />
          <ContentTextField label="Сложность от" name="difficultyStart" onChange={updateField} type="number" value={formState.difficultyStart} />
          <ContentTextField label="Сложность до" name="difficultyEnd" onChange={updateField} type="number" value={formState.difficultyEnd} />
        </div>
        <div className="content-form-grid">
          <ContentSelectField
            label="Жила после расчистки"
            name="completionVeinTypeId"
            onChange={updateField}
            options={[{ value: "", label: "Не задана" }, ...veinSelectOptions(content)]}
            value={formState.completionVeinTypeId}
          />
          <ContentSelectField
            label="Сундук перехода"
            name="completionRewardChestTypeId"
            onChange={updateField}
            options={[{ value: "", label: "Не задан" }, ...rewardChestSelectOptions(content)]}
            value={formState.completionRewardChestTypeId}
          />
        </div>
        <div className="content-form-grid">
          <ContentSelectField
            label="Награда за метр"
            name="depthRewardResourceId"
            onChange={updateField}
            options={[{ value: "", label: "Не задана" }, ...resourceSelectOptions(content)]}
            value={formState.depthRewardResourceId}
          />
          <ContentTextField label="Сумма/м" name="depthRewardAmountPerMeter" onChange={updateField} type="number" value={formState.depthRewardAmountPerMeter} />
          <ContentTextField label="Множитель" name="depthRewardMultiplier" onChange={updateField} type="number" value={formState.depthRewardMultiplier} />
          <ContentTextField label="Лимит за спуск" name="depthRewardMaxAmount" onChange={updateField} type="number" value={formState.depthRewardMaxAmount} />
        </div>
        <ContentMineVisualEditor content={content} formState={formState} updateFields={updateFields} />
      </>
    );
  }

  if (kind === "rewardChestTypes") {
    return (
      <>
        <ContentTextField disabled label="ID" name="id" onChange={updateField} value={formState.id} />
        <ContentTextField label="Название RU" name="title" onChange={updateField} value={formState.title} />
        <div className="content-form-grid">
          <ContentSelectField label="Tier" name="tier" onChange={updateField} options={rewardChestTierOptions} value={formState.tier} />
          <ContentTextField label="Asset ID" name="assetId" onChange={updateField} value={formState.assetId} />
        </div>
        <ContentBossCardDropBalancer content={content} formState={formState} prefix="reward" updateField={updateField} updateFields={updateFields} />
        <ContentRewardRows content={content} formState={formState} prefix="reward" updateField={updateField} updateFields={updateFields} />
        <ContentBossCardDropSummary content={content} formState={formState} prefix="reward" />
      </>
    );
  }

  if (kind === "bossCards") {
    return (
      <>
        <ContentTextField disabled label="ID" name="id" onChange={updateField} value={formState.id} />
        <ContentTextField label="Название RU" name="title" onChange={updateField} value={formState.title} />
        <ContentTextAreaField label="Описание RU" name="description" onChange={updateField} value={formState.description} />
        <div className="content-form-grid">
          <ContentSelectField label="Редкость" name="rarity" onChange={updateField} options={bossCardRarityOptions} value={formState.rarity} />
          <ContentSelectField label="Эффект" name="effectType" onChange={updateField} options={bossCardEffectOptions} value={formState.effectType} />
          <ContentTextField label="Asset ID" name="assetId" onChange={updateField} value={formState.assetId} />
          <ContentSelectField
            label="Ресурс-карта"
            name="cardResourceId"
            onChange={updateField}
            options={resourceSelectOptions(content)}
            value={formState.cardResourceId}
          />
          <ContentSelectField
            label="Эликсир"
            name="elixirResourceId"
            onChange={updateField}
            options={resourceSelectOptions(content)}
            value={formState.elixirResourceId}
          />
          <ContentTextField label="Бонус за уровень" name="valuePerLevel" onChange={updateField} type="number" value={formState.valuePerLevel} />
          <ContentTextField label="Max level" name="maxLevel" onChange={updateField} type="number" value={formState.maxLevel} />
          <ContentTextField label="Множитель эликсира" name="elixirCostMultiplier" onChange={updateField} type="number" value={formState.elixirCostMultiplier} />
          <ContentTextField label="Sort order" name="sortOrder" onChange={updateField} type="number" value={formState.sortOrder} />
        </div>
        <ContentTextField
          label="Копии карт по уровням"
          name="upgradeCardAmounts"
          onChange={updateField}
          placeholder="2, 5, 10, 20"
          value={formState.upgradeCardAmounts}
        />
      </>
    );
  }

  return (
    <>
      <ContentTextField disabled label="ID" name="id" onChange={updateField} value={formState.id} />
      <ContentTextField label="Название RU" name="title" onChange={updateField} value={formState.title} />
      <ContentTextField label="Asset ID" name="assetId" onChange={updateField} value={formState.assetId} />
      <div className="content-form-grid">
        <ContentSelectField label="Исходная жила" name="sourceVeinType" onChange={updateField} options={veinSelectOptions(content)} value={formState.sourceVeinType} />
        <ContentSelectField
          label="Ресурс добычи"
          name="productionResourceId"
          onChange={updateField}
          options={resourceSelectOptions(content)}
          value={formState.productionResourceId}
        />
        <ContentTextField label="Добыча в час" name="baseProductionPerHour" onChange={updateField} type="number" value={formState.baseProductionPerHour} />
        <ContentTextField label="Вместимость" name="baseCapacity" onChange={updateField} type="number" value={formState.baseCapacity} />
        <ContentTextField label="Стройка, сек" name="buildTimeSec" onChange={updateField} type="number" value={formState.buildTimeSec} />
      </div>
      <ContentResourceAmountRows
        amountLabel="Кол-во"
        content={content}
        formState={formState}
        prefix="buildCost"
        title="Стоимость строительства"
        updateField={updateField}
        updateFields={updateFields}
      />
      <section className="content-nested-section">
        <header>
          <strong>Улучшения шахты</strong>
        </header>
        <div className="content-form-grid">
          <ContentTextField label="Макс. уровень" name="upgradeMaxLevel" onChange={updateField} type="number" value={formState.upgradeMaxLevel} />
          <ContentTextField
            label="Множитель добычи"
            name="upgradeProductionMultiplier"
            onChange={updateField}
            type="number"
            value={formState.upgradeProductionMultiplier}
          />
          <ContentTextField
            label="Множитель вместимости"
            name="upgradeCapacityMultiplier"
            onChange={updateField}
            type="number"
            value={formState.upgradeCapacityMultiplier}
          />
        </div>
      </section>
      <ContentMineUpgradeCostRows
        content={content}
        formState={formState}
        prefix="upgradeCost"
        title="Стоимость улучшения"
        updateField={updateField}
        updateFields={updateFields}
      />
    </>
  );
}

function ContentTextField(props: {
  disabled?: boolean;
  label: string;
  name: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
  type?: "number" | "text";
  value?: string;
}) {
  return (
    <label>
      {props.label}
      <input
        disabled={props.disabled}
        onChange={(event) => props.onChange(props.name, event.target.value)}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        value={props.value ?? ""}
      />
    </label>
  );
}

function ContentAssetUploadField(props: {
  assetId?: string;
  label: string;
  onAssetIdChange: (assetId: string) => void;
  token: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState("");
  const assetId = props.assetId?.trim() ?? "";
  const previewUrl = assetId
    ? `/api/assets/${encodeURIComponent(assetId)}${previewVersion ? `?v=${encodeURIComponent(previewVersion)}` : ""}`
    : "";

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (!props.token) {
      setMessage("Нужна активная админ-сессия.");
      return;
    }

    if (!["image/png", "image/webp", "image/jpeg"].includes(file.type)) {
      setMessage("Поддерживаются PNG, WebP и JPG.");
      return;
    }

    const targetAssetId = assetId || assetIdFromFileName(file.name);

    if (!targetAssetId) {
      setMessage("Заполни Asset ID или загрузи файл с латинским именем.");
      return;
    }

    props.onAssetIdChange(targetAssetId);
    setBusy(true);
    setMessage(null);

    try {
      const response = await apiRequest<AssetUploadResponse>("/admin/assets/goblin-renders", {
        body: {
          assetId: targetAssetId,
          dataBase64: await readFileAsDataUrl(file),
          fileName: file.name,
          mimeType: file.type
        },
        method: "POST",
        token: props.token
      });

      setPreviewVersion(String(Date.now()));
      setMessage(`Загружено: ${response.asset.fileName}, ${formatFileSize(response.asset.size)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить рендер.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="content-asset-upload">
      <header>
        <div>
          <strong>{props.label}</strong>
          <span>PNG/WebP до 5 MB, прозрачный фон предпочтителен.</span>
        </div>
        {previewUrl ? (
          <a href={previewUrl} rel="noreferrer" target="_blank">
            открыть
          </a>
        ) : null}
      </header>
      <div className="content-asset-upload-body">
        <div className="content-asset-preview">
          {previewUrl ? <img alt="" src={previewUrl} /> : <span>нет assetId</span>}
        </div>
        <label className="content-asset-file">
          <input accept="image/png,image/webp,image/jpeg" disabled={busy || !props.token} onChange={(event) => void handleFileChange(event)} type="file" />
          <span>{busy ? "Загружаем..." : "Загрузить рендер"}</span>
        </label>
      </div>
      {message ? <p>{message}</p> : null}
    </section>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", () => reject(new Error("Не удалось прочитать файл.")));
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.readAsDataURL(file);
  });
}

function assetIdFromFileName(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/u, "");
  return baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, "_")
    .replace(/^[._-]+/u, "")
    .slice(0, 96);
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.ceil(size / 1024)} KB`;
}

function ContentTextAreaField(props: {
  label: string;
  name: string;
  onChange: (name: string, value: string) => void;
  value?: string;
}) {
  return (
    <label>
      {props.label}
      <textarea onChange={(event) => props.onChange(props.name, event.target.value)} rows={3} value={props.value ?? ""} />
    </label>
  );
}

function ContentJsonObjectField(props: {
  label: string;
  name: string;
  onChange: (value: ContentRecord) => void;
  rows?: number;
  value: ContentRecord;
}) {
  const serializedValue = useMemo(() => JSON.stringify(props.value, null, 2), [props.value]);
  const [draft, setDraft] = useState(serializedValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(serializedValue);
    setError(null);
  }, [serializedValue]);

  function handleChange(value: string) {
    setDraft(value);

    const parsed = parseJsonRecord(value);
    if (!parsed.ok) {
      setError("Нужен валидный JSON-объект.");
      return;
    }

    setError(null);
    props.onChange(parsed.value);
  }

  return (
    <label>
      {props.label}
      <textarea onChange={(event) => handleChange(event.target.value)} rows={props.rows ?? 6} value={draft} />
      {error ? <span className="content-form-note">{error}</span> : null}
    </label>
  );
}

function ContentSelectField(props: {
  label: string;
  name: string;
  onChange: (name: string, value: string) => void;
  options: Array<{ label: string; value: string }>;
  value?: string;
}) {
  return (
    <label>
      {props.label}
      <select onChange={(event) => props.onChange(props.name, event.target.value)} value={props.value ?? ""}>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ContentNestedSection(props: {
  addLabel: string;
  children: ReactNode;
  onAdd: () => void;
  title: string;
}) {
  return (
    <section className="content-nested-section">
      <header>
        <strong>{props.title}</strong>
        <button onClick={props.onAdd} type="button">
          <PlusCircle size={15} />
          {props.addLabel}
        </button>
      </header>
      {props.children}
    </section>
  );
}

function ContentResourceAmountRows(props: {
  amountLabel: string;
  content: ContentBundle;
  formState: EntityFormState;
  prefix: string;
  title: string;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const count = formCount(props.formState, `${props.prefix}Count`, 1);
  const resourceOptions = resourceSelectOptions(props.content);

  return (
    <ContentNestedSection
      addLabel="Добавить строку"
      onAdd={() =>
        props.updateFields({
          [`${props.prefix}Amount_${count}`]: "",
          [`${props.prefix}Count`]: String(count + 1),
          [`${props.prefix}ResourceId_${count}`]: resourceOptions[0]?.value ?? ""
        })
      }
      title={props.title}
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="content-list-row" key={`${props.prefix}-${index}`}>
          <ContentSelectField
            label="Ресурс"
            name={`${props.prefix}ResourceId_${index}`}
            onChange={props.updateField}
            options={resourceOptions}
            value={props.formState[`${props.prefix}ResourceId_${index}`]}
          />
          <ContentTextField
            label={props.amountLabel}
            name={`${props.prefix}Amount_${index}`}
            onChange={props.updateField}
            type="number"
            value={props.formState[`${props.prefix}Amount_${index}`]}
          />
          <button
            disabled={count <= 1}
            onClick={() =>
              props.updateFields(removeIndexedFormRow(props.formState, props.prefix, index, ["ResourceId", "Amount"], count))
            }
            type="button"
          >
            Убрать
          </button>
        </div>
      ))}
    </ContentNestedSection>
  );
}

function ContentMineUpgradeCostRows(props: {
  content: ContentBundle;
  formState: EntityFormState;
  prefix: string;
  title: string;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const count = formCount(props.formState, `${props.prefix}Count`, 1);
  const sourceOptions = mineUpgradeCostSourceOptions(props.content);

  return (
    <ContentNestedSection
      addLabel="Добавить строку"
      onAdd={() =>
        props.updateFields({
          [`${props.prefix}BaseAmount_${count}`]: "",
          [`${props.prefix}Count`]: String(count + 1),
          [`${props.prefix}LevelMultiplier_${count}`]: "1",
          [`${props.prefix}LevelPower_${count}`]: "1",
          [`${props.prefix}Source_${count}`]: upgradeCostProductionResourceValue
        })
      }
      title={props.title}
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="content-list-row content-upgrade-cost-row" key={`${props.prefix}-${index}`}>
          <ContentSelectField
            label="Ресурс"
            name={`${props.prefix}Source_${index}`}
            onChange={props.updateField}
            options={sourceOptions}
            value={props.formState[`${props.prefix}Source_${index}`]}
          />
          <ContentTextField
            label="База"
            name={`${props.prefix}BaseAmount_${index}`}
            onChange={props.updateField}
            type="number"
            value={props.formState[`${props.prefix}BaseAmount_${index}`]}
          />
          <ContentTextField
            label="Множитель уровня"
            name={`${props.prefix}LevelMultiplier_${index}`}
            onChange={props.updateField}
            type="number"
            value={props.formState[`${props.prefix}LevelMultiplier_${index}`]}
          />
          <ContentTextField
            label="Степень"
            name={`${props.prefix}LevelPower_${index}`}
            onChange={props.updateField}
            type="number"
            value={props.formState[`${props.prefix}LevelPower_${index}`]}
          />
          <button
            disabled={count <= 1}
            onClick={() =>
              props.updateFields(
                removeIndexedFormRow(props.formState, props.prefix, index, ["Source", "BaseAmount", "LevelMultiplier", "LevelPower"], count)
              )
            }
            type="button"
          >
            Убрать
          </button>
        </div>
      ))}
    </ContentNestedSection>
  );
}

function ContentGoblinGenerationArchetypeRows(props: {
  content: ContentBundle;
  formState: EntityFormState;
  sessionToken: string | null;
  updateFields: (values: EntityFormState) => void;
}) {
  const parsed = parseJsonRecordArray(formValue(props.formState, "archetypesJson"));
  const archetypes = parsed.ok ? parsed.value : [];
  const resourceOptions = resourceSelectOptions(props.content);

  function writeArchetypes(next: ContentRecord[]) {
    props.updateFields({
      archetypesJson: JSON.stringify(next, null, 2)
    });
  }

  function updateArchetype(index: number, patch: ContentRecord) {
    const next = [...archetypes];
    next[index] = {
      ...(next[index] ?? {}),
      ...patch
    };
    writeArchetypes(next);
  }

  function updateStat(index: number, stat: string, edge: "max" | "min", value: string) {
    const archetype = archetypes[index] ?? {};
    const statRanges = recordField(archetype, "statRanges");
    const currentRange = recordField(statRanges, stat);
    updateArchetype(index, {
      statRanges: {
        ...statRanges,
        [stat]: {
          ...currentRange,
          [edge]: toInteger(value)
        }
      }
    });
  }

  function updateRarity(index: number, rarity: string, field: "statMultiplier" | "weight", value: string) {
    const weights = [...arrayField(archetypes[index] ?? {}, "rarityWeights")];
    const rowIndex = weights.findIndex((row) => stringField(row, "rarity") === rarity);
    const row = rowIndex >= 0 ? weights[rowIndex] ?? {} : { rarity };
    const nextRow = {
      ...row,
      rarity,
      [field]: toNumber(value)
    };

    if (rowIndex >= 0) {
      weights[rowIndex] = nextRow;
    } else {
      weights.push(nextRow);
    }

    updateArchetype(index, { rarityWeights: weights });
  }

  function updateHireCost(index: number, costIndex: number, field: "amount" | "resourceId", value: string) {
    const costs = [...arrayField(archetypes[index] ?? {}, "hireCost")];
    const row = costs[costIndex] ?? {};
    costs[costIndex] = {
      ...row,
      [field]: field === "amount" ? toInteger(value) : value
    };
    updateArchetype(index, { hireCost: costs });
  }

  function addHireCost(index: number) {
    const costs = [...arrayField(archetypes[index] ?? {}, "hireCost")];
    costs.push({
      amount: 100,
      resourceId: resourceOptions[0]?.value ?? "gold"
    });
    updateArchetype(index, { hireCost: costs });
  }

  function removeHireCost(index: number, costIndex: number) {
    const costs = arrayField(archetypes[index] ?? {}, "hireCost").filter((_, itemIndex) => itemIndex !== costIndex);
    updateArchetype(index, { hireCost: costs });
  }

  function updateRender(index: number, renderIndex: number, field: "assetId" | "rarity" | "weight", value: string) {
    const renders = [...arrayField(archetypes[index] ?? {}, "renderPool")];
    const row = renders[renderIndex] ?? {};
    const nextRow: ContentRecord = {
      ...row,
      [field]: field === "weight" ? toNumber(value) : value
    };

    if (field === "rarity" && !value) {
      Reflect.deleteProperty(nextRow, "rarity");
    }

    renders[renderIndex] = nextRow;
    updateArchetype(index, { renderPool: renders });
  }

  function updateSpecialization(index: number, value: string) {
    const next = [...archetypes];
    const nextArchetype = {
      ...(next[index] ?? {})
    };

    if (value) {
      nextArchetype.specialization = value;
    } else {
      Reflect.deleteProperty(nextArchetype, "specialization");
    }

    next[index] = nextArchetype;
    writeArchetypes(next);
  }

  function addRender(index: number) {
    const renders = [...arrayField(archetypes[index] ?? {}, "renderPool")];
    renders.push({
      assetId: "",
      weight: 10
    });
    updateArchetype(index, { renderPool: renders });
  }

  function removeRender(index: number, renderIndex: number) {
    const renders = arrayField(archetypes[index] ?? {}, "renderPool").filter((_, itemIndex) => itemIndex !== renderIndex);
    updateArchetype(index, { renderPool: renders });
  }

  function addArchetype() {
    const goblinClass = "miner";
    const id = uniqueContentId(`random_${goblinClass}_contract`, archetypes);
    const nextArchetype: ContentRecord = {
      ability: defaultGoblinGenerationAbility(goblinClass),
      class: goblinClass,
      equipmentSlots: defaultGoblinGenerationEquipmentSlots(goblinClass),
      hireCost: [{ amount: 100, resourceId: resourceOptions[0]?.value ?? "gold" }],
      id,
      leveling: defaultGoblinGenerationLeveling(goblinClass),
      nameKey: `goblin_generation.${id}.name`,
      rarityWeights: defaultGoblinGenerationRarityWeights(),
      renderPool: [],
      sortOrder: nextSortOrder(archetypes),
      statRanges: defaultGoblinGenerationStatRanges(),
      traitPool: []
    };

    writeArchetypes([
      ...archetypes,
      nextArchetype
    ]);
  }

  if (!parsed.ok) {
    return (
      <ContentNestedSection addLabel="Добавить контракт" onAdd={addArchetype} title="Контракты случайных гоблинов">
        <p className="content-form-note">JSON архетипов сейчас невалидный. Исправь JSON ниже или добавь новый контракт.</p>
      </ContentNestedSection>
    );
  }

  return (
    <ContentNestedSection addLabel="Добавить контракт" onAdd={addArchetype} title="Контракты случайных гоблинов">
      {archetypes.map((archetype, index) => {
        const hireCosts = arrayField(archetype, "hireCost");
        const rarityWeights = normalizedGoblinGenerationRarityWeights(archetype);
        const statRanges = recordField(archetype, "statRanges");

        return (
          <div className="content-list-row content-list-row-wide content-generation-archetype" key={`${stringField(archetype, "id") || "archetype"}-${index}`}>
            <div className="content-form-grid">
              <ContentTextField
                label="ID"
                name={`goblinGenerationArchetypeId_${index}`}
                onChange={(_, value) => updateArchetype(index, { id: value })}
                value={stringField(archetype, "id")}
              />
              <ContentSelectField
                label="Класс"
                name={`goblinGenerationArchetypeClass_${index}`}
                onChange={(_, value) =>
                  updateArchetype(index, {
                    ability: defaultGoblinGenerationAbility(value),
                    class: value,
                    equipmentSlots: defaultGoblinGenerationEquipmentSlots(value),
                    leveling: defaultGoblinGenerationLeveling(value)
                  })
                }
                options={goblinClassOptions}
                value={stringField(archetype, "class") || "miner"}
              />
              <ContentSelectField
                label="Специализация"
                name={`goblinGenerationArchetypeSpecialization_${index}`}
                onChange={(_, value) => updateSpecialization(index, value)}
                options={goblinSpecializationOptions}
                value={stringField(archetype, "specialization")}
              />
              <ContentTextField
                label="Порядок"
                name={`goblinGenerationArchetypeSort_${index}`}
                onChange={(_, value) => updateArchetype(index, { sortOrder: toInteger(value) })}
                type="number"
                value={numberString(numberField(archetype, "sortOrder", 0))}
              />
            </div>

            <div className="content-form-grid">
              {["strength", "speed", "luck", "loyalty"].map((stat) => {
                const range = recordField(statRanges, stat);

                return (
                  <div className="content-generation-stat" key={stat}>
                    <strong>{statLabel(stat)}</strong>
                    <ContentTextField
                      label="От"
                      name={`goblinGeneration${stat}Min_${index}`}
                      onChange={(_, value) => updateStat(index, stat, "min", value)}
                      type="number"
                      value={numberString(numberField(range, "min", 1))}
                    />
                    <ContentTextField
                      label="До"
                      name={`goblinGeneration${stat}Max_${index}`}
                      onChange={(_, value) => updateStat(index, stat, "max", value)}
                      type="number"
                      value={numberString(numberField(range, "max", 1))}
                    />
                  </div>
                );
              })}
            </div>

            <div className="content-form-grid">
              {rarityWeights.map((rarity) => (
                <div className="content-generation-rarity" key={stringField(rarity, "rarity")}>
                  <strong>{stringField(rarity, "rarity")}</strong>
                  <ContentTextField
                    label="Вес"
                    name={`goblinGenerationRarityWeight_${index}_${stringField(rarity, "rarity")}`}
                    onChange={(_, value) => updateRarity(index, stringField(rarity, "rarity"), "weight", value)}
                    type="number"
                    value={numberString(numberField(rarity, "weight", 0))}
                  />
                  <ContentTextField
                    label="Множитель статов"
                    name={`goblinGenerationRarityMultiplier_${index}_${stringField(rarity, "rarity")}`}
                    onChange={(_, value) => updateRarity(index, stringField(rarity, "rarity"), "statMultiplier", value)}
                    type="number"
                    value={numberString(numberField(rarity, "statMultiplier", 1))}
                  />
                </div>
              ))}
            </div>

            <div className="content-form-grid">
              <ContentJsonObjectField
                label="Умение JSON"
                name={`goblinGenerationAbility_${index}`}
                onChange={(value) => updateArchetype(index, { ability: value })}
                rows={7}
                value={recordField(archetype, "ability")}
              />
              <ContentJsonObjectField
                label="Прокачка JSON"
                name={`goblinGenerationLeveling_${index}`}
                onChange={(value) => updateArchetype(index, { leveling: value })}
                rows={7}
                value={recordField(archetype, "leveling")}
              />
            </div>

            <ContentNestedSection addLabel="Добавить рендер" onAdd={() => addRender(index)} title="Пул рендеров">
              {arrayField(archetype, "renderPool").length > 0 ? (
                arrayField(archetype, "renderPool").map((render, renderIndex) => (
                  <div className="content-list-row content-list-row-wide content-generation-render" key={`${index}-render-${renderIndex}`}>
                    <ContentTextField
                      label="Asset ID"
                      name={`goblinGenerationRenderAsset_${index}_${renderIndex}`}
                      onChange={(_, value) => updateRender(index, renderIndex, "assetId", value)}
                      value={stringField(render, "assetId")}
                    />
                    <ContentSelectField
                      label="Редкость"
                      name={`goblinGenerationRenderRarity_${index}_${renderIndex}`}
                      onChange={(_, value) => updateRender(index, renderIndex, "rarity", value)}
                      options={[{ value: "", label: "Любая" }, ...rarityOptions]}
                      value={stringField(render, "rarity")}
                    />
                    <ContentTextField
                      label="Вес"
                      name={`goblinGenerationRenderWeight_${index}_${renderIndex}`}
                      onChange={(_, value) => updateRender(index, renderIndex, "weight", value)}
                      type="number"
                      value={numberString(numberField(render, "weight", 10))}
                    />
                    <button onClick={() => removeRender(index, renderIndex)} type="button">
                      Убрать
                    </button>
                    <ContentAssetUploadField
                      assetId={stringField(render, "assetId")}
                      label="Загрузка рендера"
                      onAssetIdChange={(assetId) => updateRender(index, renderIndex, "assetId", assetId)}
                      token={props.sessionToken}
                    />
                  </div>
                ))
              ) : (
                <p className="content-form-note">Пул рендеров обязателен: добавь хотя бы один Asset ID перед публикацией.</p>
              )}
            </ContentNestedSection>

            <ContentNestedSection addLabel="Добавить цену" onAdd={() => addHireCost(index)} title="Стоимость контракта">
              {hireCosts.length > 0 ? (
                hireCosts.map((cost, costIndex) => (
                  <div className="content-list-row" key={`${index}-hire-cost-${costIndex}`}>
                    <ContentSelectField
                      label="Ресурс"
                      name={`goblinGenerationHireCostResource_${index}_${costIndex}`}
                      onChange={(_, value) => updateHireCost(index, costIndex, "resourceId", value)}
                      options={resourceOptions}
                      value={stringField(cost, "resourceId")}
                    />
                    <ContentTextField
                      label="Кол-во"
                      name={`goblinGenerationHireCostAmount_${index}_${costIndex}`}
                      onChange={(_, value) => updateHireCost(index, costIndex, "amount", value)}
                      type="number"
                      value={numberString(numberField(cost, "amount", 0))}
                    />
                    <button onClick={() => removeHireCost(index, costIndex)} type="button">
                      Убрать
                    </button>
                  </div>
                ))
              ) : (
                <p className="content-form-note">Первый найм нового игрока все равно будет бесплатным.</p>
              )}
            </ContentNestedSection>

            <ContentTextField
              label="Слоты предметов через запятую"
              name={`goblinGenerationEquipmentSlots_${index}`}
              onChange={(_, value) =>
                updateArchetype(index, {
                  equipmentSlots: value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                })
              }
              value={arrayStringField(archetype, "equipmentSlots").join(", ")}
            />
            <ContentTextAreaField
              label="Черты, формат id:weight:nameKey"
              name={`goblinGenerationTraits_${index}`}
              onChange={(_, value) => updateArchetype(index, { traitPool: parseGoblinGenerationTraitLines(value) })}
              value={goblinGenerationTraitLines(arrayField(archetype, "traitPool"))}
            />
            <button onClick={() => writeArchetypes(archetypes.filter((_, itemIndex) => itemIndex !== index))} type="button">
              Удалить контракт
            </button>
          </div>
        );
      })}
    </ContentNestedSection>
  );
}

function ContentGoblinHutLevelRows(props: {
  content: ContentBundle;
  formState: EntityFormState;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const count = formCount(props.formState, "levelCount", 1);

  return (
    <ContentNestedSection
      addLabel="Добавить уровень"
      onAdd={() =>
        props.updateFields({
          [`levelClasses_${count}`]: "miner, builder, collector",
          [`levelCostCopper_${count}`]: "0",
          [`levelCostGold_${count}`]: "0",
          [`levelCostIron_${count}`]: "0",
          [`levelCostStone_${count}`]: "0",
          [`levelCount`]: String(count + 1),
          [`levelHireDiscountPercent_${count}`]: "0",
          [`levelLevel_${count}`]: String(count + 1),
          [`levelMaxHired_${count}`]: String((toInteger(props.formState[`levelMaxHired_${count - 1}`]) || count + 1) + 1),
          [`levelRequiredBuiltMines_${count}`]: "0",
          [`levelRequiredMineTemplateId_${count}`]: "",
          [`levelTitle_${count}`]: "",
          [`levelUpgradeDiscountPercent_${count}`]: "0"
        })
      }
      title="Уровни Хижины"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="content-list-row content-list-row-wide" key={`hut-level-${index}`}>
          <ContentTextField label="Ур." name={`levelLevel_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelLevel_${index}`]} />
          <ContentTextField label="Название RU" name={`levelTitle_${index}`} onChange={props.updateField} value={props.formState[`levelTitle_${index}`]} />
          <ContentTextField label="Лимит" name={`levelMaxHired_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelMaxHired_${index}`]} />
          <ContentTextField label="Роли" name={`levelClasses_${index}`} onChange={props.updateField} value={props.formState[`levelClasses_${index}`]} />
          <ContentTextField label="Скидка найма %" name={`levelHireDiscountPercent_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelHireDiscountPercent_${index}`]} />
          <ContentTextField label="Скидка прокачки %" name={`levelUpgradeDiscountPercent_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelUpgradeDiscountPercent_${index}`]} />
          <ContentTextField label="Золото" name={`levelCostGold_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostGold_${index}`]} />
          <ContentTextField label="Камень" name={`levelCostStone_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostStone_${index}`]} />
          <ContentTextField label="Медь" name={`levelCostCopper_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostCopper_${index}`]} />
          <ContentTextField label="Железо" name={`levelCostIron_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostIron_${index}`]} />
          <ContentTextField label="Нужно шахт" name={`levelRequiredBuiltMines_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelRequiredBuiltMines_${index}`]} />
          <ContentSelectField
            label="Нужен рудник"
            name={`levelRequiredMineTemplateId_${index}`}
            onChange={props.updateField}
            options={[{ value: "", label: "Не задан" }, ...mineTemplateSelectOptions(props.content)]}
            value={props.formState[`levelRequiredMineTemplateId_${index}`]}
          />
          <button
            disabled={count <= 1}
            onClick={() =>
              props.updateFields(
                removeIndexedFormRow(
                  props.formState,
                  "level",
                  index,
                  [
                    "Level",
                    "Title",
                    "MaxHired",
                    "Classes",
                    "HireDiscountPercent",
                    "UpgradeDiscountPercent",
                    "CostGold",
                    "CostStone",
                    "CostCopper",
                    "CostIron",
                    "RequiredBuiltMines",
                    "RequiredMineTemplateId"
                  ],
                  count
                )
              )
            }
            type="button"
          >
            Убрать
          </button>
        </div>
      ))}
    </ContentNestedSection>
  );
}

function ContentElevatorLevelRows(props: {
  formState: EntityFormState;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const count = formCount(props.formState, "levelCount", 1);

  return (
    <ContentNestedSection
      addLabel="Добавить уровень"
      onAdd={() =>
        props.updateFields({
          [`levelCostCopper_${count}`]: "0",
          [`levelCostElixir_${count}`]: "0",
          [`levelCostGold_${count}`]: "0",
          [`levelCostIron_${count}`]: "0",
          [`levelCostStone_${count}`]: "0",
          [`levelDropDurationMs_${count}`]: String(Math.max(500, (toInteger(props.formState[`levelDropDurationMs_${count - 1}`]) || 1450) - 130)),
          levelCount: String(count + 1),
          [`levelLevel_${count}`]: String(count + 1),
          [`levelOfflineDamageMultiplier_${count}`]: String(Math.round(((toNumber(props.formState[`levelOfflineDamageMultiplier_${count - 1}`]) || 1) + 0.05) * 100) / 100),
          [`levelPlatformSlots_${count}`]: String((toInteger(props.formState[`levelPlatformSlots_${count - 1}`]) || count + 1) + 1),
          [`levelStabilityPercent_${count}`]: String(Math.min(100, (toInteger(props.formState[`levelStabilityPercent_${count - 1}`]) || 20) + 15)),
          [`levelTitle_${count}`]: "",
          [`levelVisualStage_${count}`]: String(Math.min(5, count + 1))
        })
      }
      title="Уровни подъемника"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="content-list-row content-list-row-wide" key={`elevator-level-${index}`}>
          <ContentTextField label="Ур." name={`levelLevel_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelLevel_${index}`]} />
          <ContentTextField label="Название RU" name={`levelTitle_${index}`} onChange={props.updateField} value={props.formState[`levelTitle_${index}`]} />
          <ContentTextField label="Мест" name={`levelPlatformSlots_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelPlatformSlots_${index}`]} />
          <ContentTextField label="Вид" name={`levelVisualStage_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelVisualStage_${index}`]} />
          <ContentTextField label="Золото" name={`levelCostGold_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostGold_${index}`]} />
          <ContentTextField label="Камень" name={`levelCostStone_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostStone_${index}`]} />
          <ContentTextField label="Медь" name={`levelCostCopper_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostCopper_${index}`]} />
          <ContentTextField label="Железо" name={`levelCostIron_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostIron_${index}`]} />
          <ContentTextField label="Эликсир" name={`levelCostElixir_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostElixir_${index}`]} />
          <ContentTextField label="Спуск ms" name={`levelDropDurationMs_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelDropDurationMs_${index}`]} />
          <ContentTextField label="Офф x" name={`levelOfflineDamageMultiplier_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelOfflineDamageMultiplier_${index}`]} />
          <ContentTextField label="Надеж. %" name={`levelStabilityPercent_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelStabilityPercent_${index}`]} />
          <button
            disabled={count <= 1}
            onClick={() =>
              props.updateFields(
                removeIndexedFormRow(
                  props.formState,
                  "level",
                  index,
                  [
                    "Level",
                    "Title",
                    "PlatformSlots",
                    "DropDurationMs",
                    "OfflineDamageMultiplier",
                    "StabilityPercent",
                    "VisualStage",
                    "CostGold",
                    "CostStone",
                    "CostCopper",
                    "CostIron",
                    "CostElixir"
                  ],
                  count
                )
              )
            }
            type="button"
          >
            Убрать
          </button>
        </div>
      ))}
    </ContentNestedSection>
  );
}

function ContentRewardRows(props: {
  content: ContentBundle;
  formState: EntityFormState;
  prefix: string;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const count = formCount(props.formState, `${props.prefix}Count`, 1);
  const resourceOptions = resourceSelectOptions(props.content);

  return (
    <ContentNestedSection
      addLabel="Добавить награду"
      onAdd={() =>
        props.updateFields({
          [`${props.prefix}ChancePercent_${count}`]: "100",
          [`${props.prefix}Count`]: String(count + 1),
          [`${props.prefix}Max_${count}`]: "1",
          [`${props.prefix}Min_${count}`]: "1",
          [`${props.prefix}ResourceId_${count}`]: resourceOptions[0]?.value ?? ""
        })
      }
      title="Таблица наград"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="content-list-row content-list-row-wide" key={`${props.prefix}-${index}`}>
          <ContentSelectField
            label="Ресурс"
            name={`${props.prefix}ResourceId_${index}`}
            onChange={props.updateField}
            options={resourceOptions}
            value={props.formState[`${props.prefix}ResourceId_${index}`]}
          />
          <ContentTextField label="Min" name={`${props.prefix}Min_${index}`} onChange={props.updateField} type="number" value={props.formState[`${props.prefix}Min_${index}`]} />
          <ContentTextField label="Max" name={`${props.prefix}Max_${index}`} onChange={props.updateField} type="number" value={props.formState[`${props.prefix}Max_${index}`]} />
          <ContentTextField
            label="Chance %"
            name={`${props.prefix}ChancePercent_${index}`}
            onChange={props.updateField}
            type="number"
            value={props.formState[`${props.prefix}ChancePercent_${index}`]}
          />
          <button
            disabled={count <= 1}
            onClick={() =>
              props.updateFields(
                removeIndexedFormRow(props.formState, props.prefix, index, ["ResourceId", "Min", "Max", "ChancePercent"], count)
              )
            }
            type="button"
          >
            Убрать
          </button>
        </div>
      ))}
    </ContentNestedSection>
  );
}

function ContentBossCardDropBalancer(props: {
  content: ContentBundle;
  formState: EntityFormState;
  prefix: string;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const cardsByRarity = bossCardsByRarity(props.content);

  return (
    <section className="content-nested-section content-card-balance">
      <header>
        <div>
          <span>Баланс сундука</span>
          <strong>Карты босса и эликсир</strong>
        </div>
        <button onClick={() => props.updateFields(applyBossCardDropBalanceToFormState(props.content, props.formState, props.prefix))} type="button">
          Применить к таблице
        </button>
      </header>
      <div className="content-card-balance-grid">
        <div className="content-card-balance-row rare">
          <div className="content-card-balance-title">
            <strong>Эликсир</strong>
            <small>{resourceLabel(props.content, bossCardElixirResourceId(props.content))}</small>
          </div>
          <div className="content-form-grid">
            <ContentTextField
              label="Шанс %"
              name="cardDropElixirChancePercent"
              onChange={props.updateField}
              type="number"
              value={props.formState.cardDropElixirChancePercent}
            />
            <ContentTextField label="Min" name="cardDropElixirMin" onChange={props.updateField} type="number" value={props.formState.cardDropElixirMin} />
            <ContentTextField label="Max" name="cardDropElixirMax" onChange={props.updateField} type="number" value={props.formState.cardDropElixirMax} />
          </div>
        </div>

        {bossCardDropRarityBalanceOptions.map((option) => {
          const segment = bossCardDropRaritySegment(option.value);
          const cards = cardsByRarity.get(option.value) ?? [];

          return (
            <div className={`content-card-balance-row ${option.value}`} key={option.value}>
              <div className="content-card-balance-title">
                <strong>{option.label}</strong>
                <small>{cards.length > 0 ? cards.map((card) => contentEntityTitle(card, props.content.localization?.ru ?? {})).join(", ") : "карт нет"}</small>
              </div>
              <div className="content-form-grid">
                <ContentTextField
                  label="Шанс %"
                  name={bossCardDropField(segment, "ChancePercent")}
                  onChange={props.updateField}
                  type="number"
                  value={props.formState[bossCardDropField(segment, "ChancePercent")]}
                />
                <ContentTextField
                  label="Min"
                  name={bossCardDropField(segment, "Min")}
                  onChange={props.updateField}
                  type="number"
                  value={props.formState[bossCardDropField(segment, "Min")]}
                />
                <ContentTextField
                  label="Max"
                  name={bossCardDropField(segment, "Max")}
                  onChange={props.updateField}
                  type="number"
                  value={props.formState[bossCardDropField(segment, "Max")]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ContentBossCardDropSummary(props: { content: ContentBundle; formState: EntityFormState; prefix: string }) {
  const count = formCount(props.formState, `${props.prefix}Count`, 1);
  const rowByResourceId = new Map<string, { chancePercent: number; max: number; min: number }>();
  const bossCards = props.content.bossCards ?? [];
  const elixirResourceId = stringField(bossCards[0] ?? {}, "elixirResourceId") || findResourceId(props.content, "elixir");
  const targets: Array<{ label: string; rarity: string; resourceId: string }> = [
    { label: resourceLabel(props.content, elixirResourceId), rarity: "rare", resourceId: elixirResourceId },
    ...bossCards.map((card) => ({
      label: contentEntityTitle(card, props.content.localization?.ru ?? {}),
      rarity: stringField(card, "rarity") || "common",
      resourceId: stringField(card, "cardResourceId")
    }))
  ].filter((target) => target.resourceId);

  for (let index = 0; index < count; index += 1) {
    const resourceId = formValue(props.formState, `${props.prefix}ResourceId_${index}`);

    if (!resourceId) {
      continue;
    }

    rowByResourceId.set(resourceId, {
      chancePercent: toNumber(formValue(props.formState, `${props.prefix}ChancePercent_${index}`)),
      max: toInteger(formValue(props.formState, `${props.prefix}Max_${index}`)),
      min: toInteger(formValue(props.formState, `${props.prefix}Min_${index}`))
    });
  }

  return (
    <section className="content-nested-section content-drop-summary">
      <header>
        <strong>Баланс карт и эликсира</strong>
      </header>
      <div className="content-drop-summary-grid">
        {targets.map((target) => {
          const row = rowByResourceId.get(target.resourceId);

          return (
            <span className={row ? `content-drop-summary-item ${target.rarity}` : `content-drop-summary-item ${target.rarity} missing`} key={target.resourceId}>
              <b>{target.label}</b>
              <small>
                {adminBossCardRarityLabel(target.rarity)} · {row ? `${row.min}-${row.max} / ${row.chancePercent}%` : "не добавлено"}
              </small>
            </span>
          );
        })}
      </div>
    </section>
  );
}

function adminBossCardRarityLabel(rarity: string): string {
  switch (rarity) {
    case "golden":
      return "золотая";
    case "rare":
      return "редкая";
    default:
      return "обычная";
  }
}

function ContentMineVisualEditor(props: {
  content: ContentBundle;
  formState: EntityFormState;
  updateFields: (values: EntityFormState) => void;
}) {
  const firstBlockId = stringField(props.content.blockTypes[0] ?? {}, "id");
  const [brushBlockTypeId, setBrushBlockTypeId] = useState(firstBlockId);
  const [detailCell, setDetailCell] = useState<{ col: number; row: number } | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const visualRows = createMineVisualRows(props.content, props.formState);
  const mineWidth = Math.max(1, toInteger(props.formState.width));
  const mineHeight = visualRows.length;
  const mineCellSize = adminMineCellSize(mineWidth);
  const selectedCell = detailCell ? getMineVisualCell(props.formState, detailCell.row, detailCell.col, props.content) : null;
  const selectedCellComputedHp =
    detailCell && selectedCell
      ? mineCellComputedHp(props.content, props.formState, selectedCell.blockTypeId, detailCell.row)
      : null;
  const selectedCellEffectiveHp =
    selectedCell && selectedCellComputedHp !== null ? mineCellEffectiveHp(selectedCell, selectedCellComputedHp) : null;
  const ru = props.content.localization?.ru ?? {};

  function paintCell(row: number, col: number) {
    props.updateFields({
      [`cellBlock_${row}_${col}`]: brushBlockTypeId || firstBlockId
    });
  }

  function updateDetailCell(values: EntityFormState) {
    if (!detailCell) {
      return;
    }

    props.updateFields(
      Object.fromEntries(Object.entries(values).map(([key, value]) => [`cell${key}_${detailCell.row}_${detailCell.col}`, value]))
    );
  }

  function closeDetailCell() {
    setDetailCell(null);
  }

  return (
    <section className="content-mine-visual-editor" onPointerLeave={() => setIsPainting(false)} onPointerUp={() => setIsPainting(false)}>
      <header>
        <div>
          <strong>Визуальный редактор шахты</strong>
          <span>
            {mineWidth}x{mineHeight} · сложность {props.formState.difficultyStart || "1"} → {props.formState.difficultyEnd || "1"}
          </span>
        </div>
      </header>

      <div
        className="content-mine-visual-grid"
        style={{ "--mine-cell-size": `${mineCellSize}px`, "--mine-columns": mineWidth } as CSSProperties}
      >
        {visualRows.map((row) => {
          const rowDifficulty = mineRowDifficulty(props.formState, row.row);

          return (
            <div className="content-mine-visual-row" key={row.row} title={`Ряд ${row.row + 1} · сложность x${rowDifficulty}`}>
              <span className="content-mine-row-label">{mineRowDepthMeters(props.formState, row.row)} м</span>
              {row.cells.map((cell) => {
                const blockTitle = blockTitleById(props.content, cell.blockTypeId);
                const marker = cell.special === "reward_chest" ? "С" : "";
                const isSelected = detailCell?.row === cell.row && detailCell.col === cell.col;
                const cellStyle = { "--mine-cell-color": mineVisualBlockColor(cell.blockTypeId, cell.row + cell.col) } as CSSProperties;

                return (
                  <button
                    className={isSelected ? "content-mine-cell active" : marker ? "content-mine-cell special" : "content-mine-cell"}
                    key={`${cell.row}:${cell.col}`}
                    onDoubleClick={() => setDetailCell({ col: cell.col, row: cell.row })}
                    onPointerDown={(event) => {
                      if (event.button !== 0) {
                        return;
                      }
                      setIsPainting(true);
                      paintCell(cell.row, cell.col);
                    }}
                    onPointerEnter={() => {
                      if (isPainting) {
                        paintCell(cell.row, cell.col);
                      }
                    }}
                    style={cellStyle}
                    title={`${cell.row + 1}:${cell.col + 1} · ${blockTitle}`}
                    type="button"
                  >
                    {marker || blockTitle.slice(0, 1)}
                  </button>
                );
              })}
              <span className="content-mine-row-difficulty">x{rowDifficulty}</span>
            </div>
          );
        })}
      </div>

      <div className="content-mine-visual-legend">
        {props.content.blockTypes.map((blockType, index) => {
          const blockId = stringField(blockType, "id");
          const style = { "--mine-cell-color": mineVisualBlockColor(blockId, index) } as CSSProperties;
          const selected = brushBlockTypeId === blockId;

          return (
            <button
              className={selected ? "active" : ""}
              key={blockId}
              onClick={() => setBrushBlockTypeId(blockId)}
              style={style}
              type="button"
            >
              <i />
              {contentEntityTitle(blockType, ru)}
            </button>
          );
        })}
      </div>

      {detailCell && selectedCell ? (
        <div className="content-modal-backdrop" onClick={closeDetailCell} role="presentation">
          <section className="content-mine-cell-modal" aria-label="Параметры клетки" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>
                  Клетка {detailCell.row + 1}:{detailCell.col + 1} · {mineRowDepthMeters(props.formState, detailCell.row)} м
                </span>
                <strong>{blockTitleById(props.content, selectedCell.blockTypeId)}</strong>
              </div>
              <button onClick={closeDetailCell} type="button">
                Закрыть
              </button>
            </header>
            <div className="content-mine-cell-hp">
              <span>Текущее HP</span>
              <strong>{selectedCellEffectiveHp ?? 0}</strong>
              <small>
                Авто: {selectedCellComputedHp ?? 0} HP · сложность x{mineRowDifficulty(props.formState, detailCell.row)}
              </small>
            </div>
            <div className="content-form-grid">
              <ContentSelectField
                label="Тип камня"
                name="Block"
                onChange={(_name, value) => updateDetailCell({ Block: value, Hp: "" })}
                options={blockTypeSelectOptions(props.content)}
                value={selectedCell.blockTypeId}
              />
              <ContentTextField
                label="Задать HP"
                name="Hp"
                onChange={(_name, value) => updateDetailCell({ Hp: value })}
                placeholder={String(selectedCellComputedHp ?? "")}
                type="number"
                value={selectedCell.hp}
              />
              <ContentSelectField
                label="Особое"
                name="Special"
                onChange={(_name, value) =>
                  updateDetailCell({
                    RewardChestTypeId: value === "reward_chest" ? selectedCell.rewardChestTypeId || firstRewardChestTypeId(props.content) : "",
                    Special: value
                  })
                }
                options={[
                  { value: "", label: "Нет" },
                  { value: "reward_chest", label: "Дроп сундука" }
                ]}
                value={selectedCell.special}
              />
              {selectedCell.special === "reward_chest" ? (
                <ContentSelectField
                  label="Тип сундука"
                  name="RewardChestTypeId"
                  onChange={(_name, value) => updateDetailCell({ RewardChestTypeId: value })}
                  options={rewardChestSelectOptions(props.content)}
                  value={selectedCell.rewardChestTypeId || firstRewardChestTypeId(props.content)}
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ContentEntityKpi(props: { label: string; value: number }) {
  return (
    <div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function ContentEntityPreview(props: { content: ContentBundle }) {
  const ru = props.content.localization?.ru ?? {};
  const archetypes = arrayField(props.content.goblinGeneration ?? {}, "archetypes").slice(-3).reverse();
  const mines = props.content.mineTemplates.slice(-3).reverse();
  const builtMineTypes = (props.content.builtMineTypes ?? []).slice(-3).reverse();

  return (
    <div className="content-entity-preview">
      <ContentEntityColumn items={archetypes} label="Контракты гоблинов" localization={ru} />
      <ContentEntityColumn items={mines} label="Последние рудники" localization={ru} />
      <ContentEntityColumn items={builtMineTypes} label="Типы шахт" localization={ru} />
    </div>
  );
}

function ContentEntityColumn(props: {
  items: ContentRecord[];
  label: string;
  localization: Record<string, string>;
}) {
  return (
    <section>
      <span>{props.label}</span>
      {props.items.length > 0 ? (
        props.items.map((item) => (
          <div key={stringField(item, "id")}>
            <strong>{contentEntityTitle(item, props.localization)}</strong>
            <small>{stringField(item, "id")}</small>
          </div>
        ))
      ) : (
        <p>Пока пусто</p>
      )}
    </section>
  );
}

function parseContentPreview(contentJson: string): ContentBundle | null {
  if (!contentJson.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson);

    if (!isContentBundleLike(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function contentEntityCount(content: ContentBundle | null, key: keyof ContentBundle): number {
  if (!content) {
    return 0;
  }

  const value = content[key];
  return Array.isArray(value) ? value.length : 0;
}

export function createMineVisualRows(content: ContentBundle, formState: EntityFormState): MineVisualRow[] {
  const height = Math.max(1, toInteger(formState.height));

  return Array.from({ length: height }, (_, row): MineVisualRow => ({
    cells: Array.from({ length: Math.max(1, toInteger(formState.width)) }, (_item, col) => getMineVisualCell(formState, row, col, content)),
    row
  }));
}

export function getMineVisualCell(formState: EntityFormState, row: number, col: number, content: ContentBundle): MineVisualCell {
  const fallbackBlockId = firstBlockTypeId(content);

  return {
    blockTypeId: formValue(formState, mineCellField("Block", row, col)) || fallbackBlockId,
    col,
    hp: formValue(formState, mineCellField("Hp", row, col)),
    rewardChestTypeId: formValue(formState, mineCellField("RewardChestTypeId", row, col)),
    row,
    special: formValue(formState, mineCellField("Special", row, col))
  };
}

function mineCellField(suffix: string, row: number, col: number): string {
  return `cell${suffix}_${row}_${col}`;
}

function firstBlockTypeId(content: ContentBundle): string {
  return stringField(content.blockTypes[0] ?? {}, "id");
}

function firstRewardChestTypeId(content: ContentBundle): string {
  return stringField((content.rewardChestTypes ?? [])[0] ?? {}, "id");
}

function mineRowDepthMeters(formState: EntityFormState, row: number): number {
  const height = Math.max(1, toInteger(formState.height));
  const depthMeters = Math.max(1, toInteger(formState.depthMeters));
  return Math.max(1, Math.round(((row + 1) * depthMeters) / height));
}

function mineRowDifficulty(formState: EntityFormState, row: number): number {
  const height = Math.max(1, toInteger(formState.height));
  const start = toNumber(formState.difficultyStart) || 1;
  const end = toNumber(formState.difficultyEnd) || start;

  if (height <= 1) {
    return Math.round(start * 1000) / 1000;
  }

  const progress = Math.min(1, Math.max(0, row / (height - 1)));
  return Math.round((start + (end - start) * progress) * 1000) / 1000;
}

function mineCellComputedHp(
  content: ContentBundle,
  formState: EntityFormState,
  blockTypeId: string,
  row: number
): number {
  const blockType = content.blockTypes.find((item) => stringField(item, "id") === blockTypeId);
  const baseHp = numberField(blockType ?? {}, "baseHp", 1);
  const multiplier = mineRowDifficulty(formState, row);
  return Math.ceil(baseHp * multiplier);
}

function mineCellEffectiveHp(cell: MineVisualCell, computedHp: number): number {
  const hp = toNumber(cell.hp);
  return hp > 0 ? Math.ceil(hp) : computedHp;
}

function adminMineCellSize(mineWidth: number): number {
  const phoneWidth = 430;
  const depthWidth = 34;
  const difficultyWidth = 46;
  const gap = 4;
  const gridX = 4 + depthWidth + gap;
  const usableGridWidth = phoneWidth - gridX - difficultyWidth - gap - 10;

  return Math.max(28, Math.floor((usableGridWidth - gap * (Math.max(1, mineWidth) - 1)) / Math.max(1, mineWidth)));
}

function blockTitleById(content: ContentBundle, blockId: string): string {
  const blockType = content.blockTypes.find((item) => stringField(item, "id") === blockId);
  return blockType ? contentEntityTitle(blockType, content.localization?.ru ?? {}) : blockId || "Блок";
}

function mineVisualBlockColor(blockId: string, fallbackIndex: number): string {
  const palette = ["#9a6b3b", "#6f7f8d", "#c19a48", "#7f9b62", "#b87254", "#668b9c", "#8d72a9", "#b4a15a"];

  if (!blockId) {
    return palette[Math.max(0, fallbackIndex) % palette.length] ?? "#9a6b3b";
  }

  let hash = 0;
  for (let index = 0; index < blockId.length; index += 1) {
    hash = (hash * 31 + blockId.charCodeAt(index)) >>> 0;
  }

  return palette[hash % palette.length] ?? "#9a6b3b";
}

export function addDraftBlockTypeTemplate(content: ContentBundle): DraftContentToolResult {
  const id = uniqueContentId("draft_block", content.blockTypes);
  const nameKey = `block.${id}.name`;
  const resourceId = findResourceId(content, "stone");
  const entity: ContentRecord = {
    id,
    nameKey,
    baseHp: 80,
    tags: ["draft"],
    visualStateAssets: {
      intact: `block_${id}_intact_v1`,
      cracked: `block_${id}_cracked_v1`,
      breaking: `block_${id}_breaking_v1`
    },
    rewardTable: [{ resourceId, min: 1, max: 3, chance: 1 }],
    specialBehavior: "none"
  };
  const localization = {
    [nameKey]: "Новый блок"
  };

  return {
    content: {
      ...content,
      blockTypes: [...content.blockTypes, entity],
      localization: addRuLocalization(content.localization, localization)
    },
    entity,
    entityId: id,
    entityKind: "blockTypes",
    entityType: "blockType",
    localization,
    message: `Добавлен шаблон блока ${id}. Проверь HP, ассеты и награды, затем сохрани draft.`
  };
}

export function addDraftMineTemplate(content: ContentBundle): DraftContentToolResult {
  const source = content.mineTemplates[content.mineTemplates.length - 1];

  if (!source) {
    throw new Error("Нужен хотя бы один существующий рудник, чтобы создать шаблон.");
  }

  const id = uniqueContentId("draft_mine", content.mineTemplates);
  const displayNameKey = `mine.${id}.name`;
  const width = 7;
  const height = 10;
  const sourceDepthProgressReward = recordField(source, "depthProgressReward");
  const entity: ContentRecord = {
    completionRewardChestTypeId: stringField(source, "completionRewardChestTypeId") || undefined,
    completionVeinTypeId: stringField(source, "completionVeinTypeId") || undefined,
    depthMeters: 10,
    difficultyEnd: 1.8,
    difficultyStart: 1,
    id,
    cellMap: createDefaultMineCellMap(content, width, height),
    displayNameKey,
    height,
    sortOrder: nextSortOrder(content.mineTemplates),
    width
  };
  if (stringField(sourceDepthProgressReward, "resourceId")) {
    entity.depthProgressReward = sourceDepthProgressReward;
  }
  const localization = {
    [displayNameKey]: "Новый рудник"
  };

  return {
    content: {
      ...content,
      mineTemplates: [...content.mineTemplates, entity],
      localization: addRuLocalization(content.localization, localization)
    },
    entity,
    entityId: id,
    entityKind: "mineTemplates",
    entityType: "mineTemplate",
    localization,
    message: `Добавлен шаблон рудника ${id}. Проверь размер, жилу, сундук и карту клеток перед публикацией.`
  };
}

function createDefaultMineCellMap(content: ContentBundle, width: number, height: number): ContentRecord[] {
  const blockTypeId = firstBlockTypeId(content);

  return Array.from({ length: height }, (_rowItem, row) =>
    Array.from({ length: width }, (_colItem, col) => ({
      blockTypeId,
      col,
      row
    }))
  ).flat();
}

function addDraftBuiltMineTypeTemplate(content: ContentBundle): DraftContentToolResult {
  const builtMineTypes = content.builtMineTypes ?? [];
  const source = builtMineTypes[builtMineTypes.length - 1];

  if (!source) {
    throw new Error("Нужен хотя бы один тип шахты, чтобы создать шаблон.");
  }

  const id = uniqueContentId("draft_built_mine", builtMineTypes);
  const nameKey = `built_mine.${id}.name`;
  const entity: ContentRecord = {
    ...cloneRecord(source),
    id,
    nameKey,
    assetId: `built_mine_${id}_v1`
  };
  const localization = {
    [nameKey]: "Новая постоянная шахта"
  };

  return {
    content: {
      ...content,
      builtMineTypes: [...builtMineTypes, entity],
      localization: addRuLocalization(content.localization, localization)
    },
    entity,
    entityId: id,
    entityKind: "builtMineTypes",
    entityType: "builtMineType",
    localization,
    message: `Добавлен шаблон типа шахты ${id}. Проверь ресурс добычи, жилу и стоимость.`
  };
}

export function addDraftRewardChestTypeTemplate(content: ContentBundle): DraftContentToolResult {
  const rewardChestTypes = content.rewardChestTypes ?? [];
  const id = uniqueContentId("draft_reward_chest", rewardChestTypes);
  const nameKey = `reward_chest.${id}.name`;
  const goldResourceId = findResourceId(content, "gold");
  const stoneResourceId = findResourceId(content, "stone");
  const entity: ContentRecord = {
    id,
    nameKey,
    tier: "wooden",
    rewardTable: [
      { resourceId: goldResourceId, min: 25, max: 60, chance: 1 },
      { resourceId: stoneResourceId, min: 10, max: 25, chance: 0.75 }
    ],
    assetId: `reward_chest_${id}_v1`
  };
  const localization = {
    [nameKey]: "Новый сундук"
  };

  return {
    content: {
      ...content,
      rewardChestTypes: [...rewardChestTypes, entity],
      localization: addRuLocalization(content.localization, localization)
    },
    entity,
    entityId: id,
    entityKind: "rewardChestTypes",
    entityType: "rewardChestType",
    localization,
    message: `Добавлен шаблон сундука ${id}. Проверь tier, ассет и таблицу наград, затем сохрани draft.`
  };
}

export function addDraftBossCardTemplate(content: ContentBundle): DraftContentToolResult {
  const bossCards = content.bossCards ?? [];
  const id = uniqueContentId("draft_boss_card", bossCards);
  const nameKey = `boss_card.${id}.name`;
  const descriptionKey = `boss_card.${id}.description`;
  const entity: ContentRecord = {
    id,
    nameKey,
    descriptionKey,
    rarity: "common",
    assetId: `boss_card_${id}_v1`,
    cardResourceId: findResourceId(content, "boss_card_hit_damage"),
    effectType: "damagePerTap",
    valuePerLevel: 1,
    maxLevel: 8,
    upgradeCardAmounts: [2, 5, 10, 20, 50, 100, 180, 300],
    elixirResourceId: findResourceId(content, "elixir"),
    elixirCostMultiplier: 4,
    sortOrder: nextSortOrder(bossCards)
  };
  const localization = {
    [nameKey]: "Новая карта босса",
    [descriptionKey]: "Черновая карта для настройки бонуса босса."
  };

  return {
    content: {
      ...content,
      bossCards: [...bossCards, entity],
      localization: addRuLocalization(content.localization, localization)
    },
    entity,
    entityId: id,
    entityKind: "bossCards",
    entityType: "bossCard",
    localization,
    message: `Добавлена карта босса ${id}. Проверь ресурс, эффект, стоимость и сохрани draft.`
  };
}

function isContentBundleLike(value: unknown): value is ContentBundle {
  return (
    isRecord(value) &&
    Array.isArray(value.resources) &&
    Array.isArray(value.blockTypes) &&
    Array.isArray(value.mineTemplates) &&
    isRecord(value.goblinGeneration) &&
    isRecord(value.goblinHut) &&
    isRecord(value.elevator)
  );
}

function isRecord(value: unknown): value is ContentRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneRecord(record: ContentRecord): ContentRecord {
  return JSON.parse(JSON.stringify(record)) as ContentRecord;
}

function stringField(record: ContentRecord, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function contentEntityTitle(record: ContentRecord, localization: Record<string, string>): string {
  const titleKey = stringField(record, "nameKey") || stringField(record, "displayNameKey");
  return localization[titleKey] ?? (titleKey || stringField(record, "id") || "Без id");
}

function uniqueContentId(prefix: string, items: ContentRecord[]): string {
  const existingIds = new Set(items.map((item) => stringField(item, "id")).filter(Boolean));
  let index = items.length + 1;
  let id = `${prefix}_${String(index).padStart(2, "0")}`;

  while (existingIds.has(id)) {
    index += 1;
    id = `${prefix}_${String(index).padStart(2, "0")}`;
  }

  return id;
}

function nextSortOrder(items: ContentRecord[]): number {
  const maxSortOrder = items.reduce((max, item) => {
    const value = item.sortOrder;
    return typeof value === "number" && Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return maxSortOrder + 10;
}

function findResourceId(content: ContentBundle, preferredId: string): string {
  if (content.resources.some((resource) => stringField(resource, "id") === preferredId)) {
    return preferredId;
  }

  return content.resources[0] ? stringField(content.resources[0], "id") : preferredId;
}

function addRuLocalization(
  localization: ContentBundle["localization"],
  entries: Record<string, string>
): ContentBundle["localization"] {
  return {
    ...(localization ?? {}),
    ru: {
      ...(localization?.ru ?? {}),
      ...entries
    }
  };
}

function getContentEntityItems(content: ContentBundle, kind: ContentEntityKind): ContentRecord[] {
  switch (kind) {
    case "blockTypes":
      return content.blockTypes;
    case "bossCards":
      return content.bossCards ?? [];
    case "builtMineTypes":
      return content.builtMineTypes ?? [];
    case "elevator":
      return [content.elevator ?? { id: "default", nameKey: "elevator.name", levels: [] }];
    case "goblinGeneration":
      return [
        content.goblinGeneration ?? {
          archetypes: [],
          id: "default",
          nameKey: "goblin_generation.name",
          namePool: { names: [], nicknames: [] }
        }
      ];
    case "goblinHut":
      return [content.goblinHut ?? { id: "default", nameKey: "goblin_hut.name", levels: [] }];
    case "mineTemplates":
      return content.mineTemplates;
    case "rewardChestTypes":
      return content.rewardChestTypes ?? [];
    default:
      return [];
  }
}

function createEntityFormState(kind: ContentEntityKind, entity: ContentRecord, content: ContentBundle): EntityFormState {
  if (kind === "blockTypes") {
    return createBlockTypeFormState(entity, content);
  }

  if (kind === "bossCards") {
    return createBossCardFormState(entity, content);
  }

  if (kind === "goblinGeneration") {
    return createGoblinGenerationFormState(entity, content);
  }

  if (kind === "goblinHut") {
    return createGoblinHutFormState(entity, content);
  }

  if (kind === "elevator") {
    return createElevatorFormState(entity, content);
  }

  if (kind === "mineTemplates") {
    return createMineTemplateFormState(entity, content);
  }

  if (kind === "rewardChestTypes") {
    return createRewardChestTypeFormState(entity, content);
  }

  return createBuiltMineTypeFormState(entity, content);
}

function createBlockTypeFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const visualStateAssets = recordField(entity, "visualStateAssets");
  return {
    assetBreaking: stringField(visualStateAssets, "breaking"),
    assetCracked: stringField(visualStateAssets, "cracked"),
    assetIntact: stringField(visualStateAssets, "intact"),
    baseHp: numberString(numberField(entity, "baseHp", 1)),
    id: stringField(entity, "id"),
    specialBehavior: stringField(entity, "specialBehavior") || "none",
    tags: arrayStringField(entity, "tags").join(", "),
    title: localizationValue(content, stringField(entity, "nameKey")),
    ...createRewardTableFormState("reward", arrayField(entity, "rewardTable"), content)
  };
}

function createGoblinGenerationFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const namePool = recordField(entity, "namePool");

  return {
    archetypesJson: JSON.stringify(arrayField(entity, "archetypes"), null, 2),
    id: stringField(entity, "id") || "default",
    namePoolNames: arrayStringField(namePool, "names").join("\n"),
    namePoolNicknames: arrayStringField(namePool, "nicknames").join("\n"),
    title: localizationValue(content, stringField(entity, "nameKey"))
  };
}

function createGoblinHutFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const levels = arrayField(entity, "levels");
  const count = Math.max(1, levels.length);
  const state: EntityFormState = {
    id: stringField(entity, "id") || "default",
    title: localizationValue(content, stringField(entity, "nameKey")),
    levelCount: String(count)
  };

  for (let index = 0; index < count; index += 1) {
    const level = recordAt(levels, index);
    const upgradeCost = arrayField(level, "upgradeCost");
    const unlockRequirements = arrayField(level, "unlockRequirements");
    const requiredBuiltMines = unlockRequirements.find((requirement) => stringField(requirement, "type") === "built_mines_count");
    const requiredMine = unlockRequirements.find((requirement) => stringField(requirement, "type") === "mine_completed");

    state[`levelLevel_${index}`] = numberString(numberField(level, "level", index + 1));
    state[`levelTitle_${index}`] = localizationValue(content, stringField(level, "nameKey"));
    state[`levelMaxHired_${index}`] = numberString(numberField(level, "maxHiredGoblins", 1));
    state[`levelClasses_${index}`] = arrayStringField(level, "unlockedClasses").join(", ");
    state[`levelHireDiscountPercent_${index}`] = numberString(multiplierReductionToPercent(numberField(level, "hireCostMultiplier", 1)));
    state[`levelUpgradeDiscountPercent_${index}`] = numberString(multiplierReductionToPercent(numberField(level, "upgradeCostMultiplier", 1)));
    state[`levelCostGold_${index}`] = numberString(resourceAmountField(upgradeCost, "gold"));
    state[`levelCostStone_${index}`] = numberString(resourceAmountField(upgradeCost, "stone"));
    state[`levelCostCopper_${index}`] = numberString(resourceAmountField(upgradeCost, "copper_ore"));
    state[`levelCostIron_${index}`] = numberString(resourceAmountField(upgradeCost, "iron"));
    state[`levelRequiredBuiltMines_${index}`] = numberString(numberField(requiredBuiltMines ?? {}, "value", 0));
    state[`levelRequiredMineTemplateId_${index}`] = stringField(requiredMine ?? {}, "mineTemplateId");
  }

  return state;
}

function createElevatorFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const levels = arrayField(entity, "levels");
  const count = Math.max(1, levels.length);
  const state: EntityFormState = {
    id: stringField(entity, "id") || "default",
    title: localizationValue(content, stringField(entity, "nameKey")),
    levelCount: String(count)
  };

  for (let index = 0; index < count; index += 1) {
    const level = recordAt(levels, index);
    const upgradeCost = arrayField(level, "upgradeCost");

    state[`levelLevel_${index}`] = numberString(numberField(level, "level", index + 1));
    state[`levelTitle_${index}`] = localizationValue(content, stringField(level, "nameKey"));
    state[`levelPlatformSlots_${index}`] = numberString(numberField(level, "platformSlots", Math.max(1, index + 2)));
    state[`levelDropDurationMs_${index}`] = numberString(numberField(level, "dropDurationMs", 1450));
    state[`levelOfflineDamageMultiplier_${index}`] = numberString(numberField(level, "offlineDamageMultiplier", 1));
    state[`levelStabilityPercent_${index}`] = numberString(numberField(level, "stabilityPercent", 20));
    state[`levelVisualStage_${index}`] = numberString(numberField(level, "visualStage", Math.min(5, index + 1)));
    state[`levelCostGold_${index}`] = numberString(resourceAmountField(upgradeCost, "gold"));
    state[`levelCostStone_${index}`] = numberString(resourceAmountField(upgradeCost, "stone"));
    state[`levelCostCopper_${index}`] = numberString(resourceAmountField(upgradeCost, "copper_ore"));
    state[`levelCostIron_${index}`] = numberString(resourceAmountField(upgradeCost, "iron"));
    state[`levelCostElixir_${index}`] = numberString(resourceAmountField(upgradeCost, "elixir"));
  }

  return state;
}

function createMineTemplateFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const width = Math.max(1, numberField(entity, "width", 8));
  const height = Math.max(1, numberField(entity, "height", 10));
  const difficulty = numberField(entity, "difficulty", 1);
  const depthProgressReward = recordField(entity, "depthProgressReward");

  return {
    completionRewardChestTypeId: stringField(entity, "completionRewardChestTypeId"),
    completionVeinTypeId: stringField(entity, "completionVeinTypeId"),
    depthMeters: numberString(numberField(entity, "depthMeters", 1)),
    depthRewardAmountPerMeter: numberString(numberField(depthProgressReward, "amountPerMeter", 0)),
    depthRewardMaxAmount: numberField(depthProgressReward, "maxAmount", 0) > 0 ? numberString(numberField(depthProgressReward, "maxAmount", 0)) : "",
    depthRewardMultiplier: numberString(numberField(depthProgressReward, "multiplier", 1)),
    depthRewardResourceId: stringField(depthProgressReward, "resourceId"),
    difficultyEnd: numberString(numberField(entity, "difficultyEnd", difficulty)),
    difficultyStart: numberString(numberField(entity, "difficultyStart", difficulty)),
    height: numberString(height),
    id: stringField(entity, "id"),
    sortOrder: numberString(numberField(entity, "sortOrder", 0)),
    title: localizationValue(content, stringField(entity, "displayNameKey")),
    width: numberString(width),
    ...createCellMapFormState(entity, content, width, height)
  };
}

function createBuiltMineTypeFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const buildCost = arrayField(entity, "buildCost");
  const upgrade = recordField(entity, "upgrade");
  const upgradeCost = arrayField(upgrade, "cost");

  return {
    assetId: stringField(entity, "assetId"),
    baseCapacity: numberString(numberField(entity, "baseCapacity", 1)),
    baseProductionPerHour: numberString(numberField(entity, "baseProductionPerHour", 1)),
    buildTimeSec: numberString(numberField(entity, "buildTimeSec", 0)),
    id: stringField(entity, "id"),
    productionResourceId: stringField(entity, "productionResourceId") || findResourceId(content, "gold"),
    sourceVeinType: stringField(entity, "sourceVeinType") || stringField((content.veinTypes ?? [])[0] ?? {}, "id"),
    title: localizationValue(content, stringField(entity, "nameKey")),
    upgradeCapacityMultiplier: numberString(numberField(upgrade, "capacityMultiplier", 1.4)),
    upgradeMaxLevel: numberString(numberField(upgrade, "maxLevel", 5)),
    upgradeProductionMultiplier: numberString(numberField(upgrade, "productionMultiplier", 1.35)),
    ...createResourceAmountFormState("buildCost", buildCost, content, "stone"),
    ...createMineUpgradeCostFormState("upgradeCost", upgradeCost)
  };
}

function createRewardChestTypeFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  return {
    assetId: stringField(entity, "assetId"),
    id: stringField(entity, "id"),
    tier: stringField(entity, "tier") || "wooden",
    title: localizationValue(content, stringField(entity, "nameKey")),
    ...createBossCardDropBalanceFormState(entity, content),
    ...createRewardTableFormState("reward", arrayField(entity, "rewardTable"), content)
  };
}

function createBossCardFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const upgradeCardAmounts = entity.upgradeCardAmounts;

  return {
    assetId: stringField(entity, "assetId") || "boss_card_generic_v1",
    cardResourceId: stringField(entity, "cardResourceId") || findResourceId(content, "boss_card_hit_damage"),
    description: localizationValue(content, stringField(entity, "descriptionKey")),
    effectType: stringField(entity, "effectType") || "damagePerTap",
    elixirCostMultiplier: numberString(numberField(entity, "elixirCostMultiplier", 4)),
    elixirResourceId: stringField(entity, "elixirResourceId") || findResourceId(content, "elixir"),
    id: stringField(entity, "id"),
    maxLevel: numberString(numberField(entity, "maxLevel", 8)),
    rarity: stringField(entity, "rarity") || "common",
    sortOrder: numberString(numberField(entity, "sortOrder", 0)),
    title: localizationValue(content, stringField(entity, "nameKey")),
    upgradeCardAmounts: Array.isArray(upgradeCardAmounts)
      ? upgradeCardAmounts.filter((item): item is number => typeof item === "number").join(", ")
      : "2, 5, 10, 20, 50, 100, 180, 300",
    valuePerLevel: numberString(numberField(entity, "valuePerLevel", 1))
  };
}

function createResourceAmountFormState(
  prefix: string,
  rows: ContentRecord[],
  content: ContentBundle,
  fallbackResourceId: string
): EntityFormState {
  const count = Math.max(1, rows.length);
  const state: EntityFormState = {
    [`${prefix}Count`]: String(count)
  };

  for (let index = 0; index < count; index += 1) {
    const row = recordAt(rows, index);
    state[`${prefix}Amount_${index}`] = numberString(numberField(row, "amount", 0));
    state[`${prefix}ResourceId_${index}`] = stringField(row, "resourceId") || findResourceId(content, fallbackResourceId);
  }

  return state;
}

function createMineUpgradeCostFormState(prefix: string, rows: ContentRecord[]): EntityFormState {
  const fallbackRows =
    rows.length > 0
      ? rows
      : [
          {
            baseAmount: 60,
            levelMultiplier: 1,
            levelPower: 1,
            useProductionResource: true
          },
          {
            baseAmount: 100,
            levelMultiplier: 1,
            levelPower: 1.35,
            resourceId: "gold"
          }
        ];
  const count = Math.max(1, fallbackRows.length);
  const state: EntityFormState = {
    [`${prefix}Count`]: String(count)
  };

  for (let index = 0; index < count; index += 1) {
    const row = recordAt(fallbackRows, index);
    state[`${prefix}BaseAmount_${index}`] = numberString(numberField(row, "baseAmount", 1));
    state[`${prefix}LevelMultiplier_${index}`] = numberString(numberField(row, "levelMultiplier", 1));
    state[`${prefix}LevelPower_${index}`] = numberString(numberField(row, "levelPower", 1));
    state[`${prefix}Source_${index}`] =
      row.useProductionResource === true ? upgradeCostProductionResourceValue : stringField(row, "resourceId") || "gold";
  }

  return state;
}

function createRewardTableFormState(prefix: string, rows: ContentRecord[], content: ContentBundle): EntityFormState {
  const count = Math.max(1, rows.length);
  const state: EntityFormState = {
    [`${prefix}Count`]: String(count)
  };

  for (let index = 0; index < count; index += 1) {
    const row = recordAt(rows, index);
    state[`${prefix}ChancePercent_${index}`] = numberString(Math.round(numberField(row, "chance", 1) * 100));
    state[`${prefix}Max_${index}`] = numberString(numberField(row, "max", 1));
    state[`${prefix}Min_${index}`] = numberString(numberField(row, "min", 1));
    state[`${prefix}ResourceId_${index}`] = stringField(row, "resourceId") || findResourceId(content, "gold");
  }

  return state;
}

function createBossCardDropBalanceFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const rows = arrayField(entity, "rewardTable");
  const state: EntityFormState = {};
  const elixirRow = rewardRowByResourceId(rows, bossCardElixirResourceId(content));

  state.cardDropElixirChancePercent = rewardChancePercentString(elixirRow, 100);
  state.cardDropElixirMin = numberString(numberField(elixirRow ?? {}, "min", 1));
  state.cardDropElixirMax = numberString(numberField(elixirRow ?? {}, "max", 1));

  for (const option of bossCardDropRarityBalanceOptions) {
    const segment = bossCardDropRaritySegment(option.value);
    const firstCardRow = bossCardsByRarity(content)
      .get(option.value)
      ?.map((card) => rewardRowByResourceId(rows, stringField(card, "cardResourceId")))
      .find((row): row is ContentRecord => Boolean(row));

    state[bossCardDropField(segment, "ChancePercent")] = rewardChancePercentString(firstCardRow, 0);
    state[bossCardDropField(segment, "Min")] = numberString(numberField(firstCardRow ?? {}, "min", 1));
    state[bossCardDropField(segment, "Max")] = numberString(numberField(firstCardRow ?? {}, "max", 1));
  }

  return state;
}

function createCellMapFormState(entity: ContentRecord, content: ContentBundle, width: number, height: number): EntityFormState {
  const state: EntityFormState = {};
  const cellMap = arrayField(entity, "cellMap");
  const fallbackBlockId = firstBlockTypeId(content);
  const cellsByKey = new Map(cellMap.map((cell) => [`${numberField(cell, "row", 0)}:${numberField(cell, "col", 0)}`, cell]));

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const cell = cellsByKey.get(`${row}:${col}`) ?? {};
      const hp = numberField(cell, "hp", 0);

      state[mineCellField("Block", row, col)] = stringField(cell, "blockTypeId") || fallbackBlockId;
      state[mineCellField("Hp", row, col)] = hp > 0 ? numberString(hp) : "";
      state[mineCellField("RewardChestTypeId", row, col)] = stringField(cell, "rewardChestTypeId");
      state[mineCellField("Special", row, col)] = stringField(cell, "special");
    }
  }

  return state;
}

function validateEntityForm(
  kind: ContentEntityKind,
  state: EntityFormState,
  content: ContentBundle,
  selectedId: string
): FormValidation {
  const errors: string[] = [];
  const items = getContentEntityItems(content, kind);
  const id = formValue(state, "id");
  const title = formValue(state, "title");

  if (!id.trim()) {
    errors.push("ID обязателен.");
  }

  if (items.some((item) => stringField(item, "id") === id && stringField(item, "id") !== selectedId)) {
    errors.push("ID должен быть уникальным.");
  }

  if (!title.trim()) {
    errors.push("Название RU обязательно.");
  }

  if (kind === "blockTypes") {
    validateBlockTypeForm(state, content, errors);
  } else if (kind === "bossCards") {
    validateBossCardForm(state, content, errors);
  } else if (kind === "goblinGeneration") {
    validateGoblinGenerationForm(state, content, errors);
  } else if (kind === "goblinHut") {
    validateGoblinHutForm(state, content, errors);
  } else if (kind === "elevator") {
    validateElevatorForm(state, errors);
  } else if (kind === "mineTemplates") {
    validateMineTemplateForm(state, content, errors);
  } else if (kind === "rewardChestTypes") {
    validateRewardChestTypeForm(state, content, errors);
  } else {
    validateBuiltMineTypeForm(state, content, errors);
  }

  return {
    errors,
    ok: errors.length === 0
  };
}

function validateBlockTypeForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  validateIntegerField(state, "baseHp", "HP", errors, { min: 1 });

  if (!specialBehaviorOptions.some((option) => option.value === formValue(state, "specialBehavior"))) {
    errors.push("Выбери корректное особое поведение.");
  }

  for (const field of ["assetIntact", "assetCracked", "assetBreaking"]) {
    if (!formValue(state, field).trim()) {
      errors.push(`${field}: asset обязателен.`);
    }
  }

  validateRewardRows(state, "reward", content, errors);
}

function validateGoblinGenerationForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  const names = parseLineList(formValue(state, "namePoolNames"));
  const nicknames = parseLineList(formValue(state, "namePoolNicknames"));
  const archetypes = parseJsonRecordArray(formValue(state, "archetypesJson"));
  const resources = resourceIdSet(content);

  if (names.length === 0) {
    errors.push("Пул имен должен содержать хотя бы одно имя.");
  }

  if (nicknames.length === 0) {
    errors.push("Пул прозвищ должен содержать хотя бы одно прозвище.");
  }

  if (!archetypes.ok) {
    errors.push("Архетипы найма должны быть валидным JSON-массивом.");
    return;
  }

  for (const archetype of archetypes.value) {
    const id = stringField(archetype, "id");
    const specialization = stringField(archetype, "specialization");

    if (!id) {
      errors.push("У каждого архетипа должен быть id.");
    }

    if (specialization && !goblinSpecializationOptions.some((option) => option.value === specialization)) {
      errors.push(`Архетип ${id || "без id"}: специализация ${specialization} не найдена.`);
    }

    validateGoblinGenerationAbility(archetype, id, resources, errors);
    validateGoblinGenerationLeveling(archetype, id, resources, errors);

    for (const cost of arrayField(archetype, "hireCost")) {
      const resourceId = stringField(cost, "resourceId");

      if (resourceId && !resources.has(resourceId)) {
        errors.push(`Архетип ${id || "без id"}: ресурс найма ${resourceId} не найден.`);
      }
    }

    for (const render of arrayField(archetype, "renderPool")) {
      const assetId = stringField(render, "assetId");
      const renderRarity = stringField(render, "rarity");

      if (!assetId) {
        errors.push(`Архетип ${id || "без id"}: у рендера должен быть Asset ID.`);
      }

      if (numberField(render, "weight", 0) <= 0) {
        errors.push(`Архетип ${id || "без id"}: вес рендера должен быть больше 0.`);
      }

      if (renderRarity && !rarityOptions.some((option) => option.value === renderRarity)) {
        errors.push(`Архетип ${id || "без id"}: редкость рендера ${renderRarity} не найдена.`);
      }
    }
  }
}

function validateGoblinGenerationAbility(archetype: ContentRecord, id: string, resources: Set<string>, errors: string[]) {
  const ability = recordField(archetype, "ability");
  const label = `Архетип ${id || "без id"}`;

  if (Object.keys(ability).length === 0) {
    errors.push(`${label}: ability обязателен в генерации.`);
    return;
  }

  for (const field of ["id", "nameKey", "descriptionKey"]) {
    if (!stringField(ability, field)) {
      errors.push(`${label}: ability.${field} обязателен.`);
    }
  }

  for (const effect of arrayField(ability, "effects")) {
    const effectResourceId = stringField(effect, "resourceId");

    if (effectResourceId && !resources.has(effectResourceId)) {
      errors.push(`${label}: ability ссылается на неизвестный ресурс ${effectResourceId}.`);
    }
  }
}

function validateGoblinGenerationLeveling(archetype: ContentRecord, id: string, resources: Set<string>, errors: string[]) {
  const leveling = recordField(archetype, "leveling");
  const label = `Архетип ${id || "без id"}`;

  if (Object.keys(leveling).length === 0) {
    errors.push(`${label}: leveling обязателен в генерации.`);
    return;
  }

  if (numberField(leveling, "maxLevel", 0) <= 0) {
    errors.push(`${label}: leveling.maxLevel должен быть больше 0.`);
  }

  for (const cost of arrayField(leveling, "cost")) {
    const resourceId = stringField(cost, "resourceId");

    if (resourceId && !resources.has(resourceId)) {
      errors.push(`${label}: leveling ссылается на неизвестный ресурс ${resourceId}.`);
    }
  }
}

function validateGoblinHutForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  const count = formCount(state, "levelCount", 1);
  const seenLevels = new Set<number>();
  const validClasses = new Set(goblinClassOptions.map((option) => option.value));
  const validMineTemplateIds = new Set(content.mineTemplates.map((mineTemplate) => stringField(mineTemplate, "id")));

  for (let index = 0; index < count; index += 1) {
    const rowLabel = `Уровень Хижины ${index + 1}`;
    const level = toInteger(state[`levelLevel_${index}`]);
    const classes = formValue(state, `levelClasses_${index}`)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const requiredMineTemplateId = formValue(state, `levelRequiredMineTemplateId_${index}`);

    validateIntegerField(state, `levelLevel_${index}`, `${rowLabel}: номер`, errors, { min: 1 });
    validateIntegerField(state, `levelMaxHired_${index}`, `${rowLabel}: лимит`, errors, { min: 1 });
    validateNumberField(state, `levelHireDiscountPercent_${index}`, `${rowLabel}: скидка найма`, errors, { min: 0 });
    validateNumberField(state, `levelUpgradeDiscountPercent_${index}`, `${rowLabel}: скидка прокачки`, errors, { min: 0 });
    validateIntegerField(state, `levelCostGold_${index}`, `${rowLabel}: золото`, errors, { min: 0 });
    validateIntegerField(state, `levelCostStone_${index}`, `${rowLabel}: камень`, errors, { min: 0 });
    validateIntegerField(state, `levelCostCopper_${index}`, `${rowLabel}: медь`, errors, { min: 0 });
    validateIntegerField(state, `levelCostIron_${index}`, `${rowLabel}: железо`, errors, { min: 0 });
    validateIntegerField(state, `levelRequiredBuiltMines_${index}`, `${rowLabel}: нужно шахт`, errors, { min: 0 });

    if (!formValue(state, `levelTitle_${index}`).trim()) {
      errors.push(`${rowLabel}: название RU обязательно.`);
    }

    if (seenLevels.has(level)) {
      errors.push(`${rowLabel}: номер уровня должен быть уникальным.`);
    }
    seenLevels.add(level);

    if (classes.length === 0 || classes.some((item) => !validClasses.has(item))) {
      errors.push(`${rowLabel}: роли должны быть из списка miner, builder, collector, foreman.`);
    }

    if (requiredMineTemplateId && !validMineTemplateIds.has(requiredMineTemplateId)) {
      errors.push(`${rowLabel}: рудник условия не найден.`);
    }
  }
}

function validateElevatorForm(state: EntityFormState, errors: string[]) {
  const count = formCount(state, "levelCount", 1);
  const seenLevels = new Set<number>();

  for (let index = 0; index < count; index += 1) {
    const rowLabel = `Уровень подъемника ${index + 1}`;
    const level = toInteger(state[`levelLevel_${index}`]);

    validateIntegerField(state, `levelLevel_${index}`, `${rowLabel}: номер`, errors, { min: 1 });
    validateIntegerField(state, `levelPlatformSlots_${index}`, `${rowLabel}: места`, errors, { min: 1 });
    validateIntegerField(state, `levelDropDurationMs_${index}`, `${rowLabel}: спуск`, errors, { min: 500, max: 2500 });
    validateNumberField(state, `levelOfflineDamageMultiplier_${index}`, `${rowLabel}: оффлайн-урон`, errors, { min: 1 });
    validateIntegerField(state, `levelStabilityPercent_${index}`, `${rowLabel}: надежность`, errors, { min: 0, max: 100 });
    validateIntegerField(state, `levelVisualStage_${index}`, `${rowLabel}: вид`, errors, { min: 1, max: 5 });
    validateIntegerField(state, `levelCostGold_${index}`, `${rowLabel}: золото`, errors, { min: 0 });
    validateIntegerField(state, `levelCostStone_${index}`, `${rowLabel}: камень`, errors, { min: 0 });
    validateIntegerField(state, `levelCostCopper_${index}`, `${rowLabel}: медь`, errors, { min: 0 });
    validateIntegerField(state, `levelCostIron_${index}`, `${rowLabel}: железо`, errors, { min: 0 });
    validateIntegerField(state, `levelCostElixir_${index}`, `${rowLabel}: эликсир`, errors, { min: 0 });

    if (!formValue(state, `levelTitle_${index}`).trim()) {
      errors.push(`${rowLabel}: название RU обязательно.`);
    }

    if (seenLevels.has(level)) {
      errors.push(`${rowLabel}: номер уровня должен быть уникальным.`);
    }
    seenLevels.add(level);
  }
}

function validateMineTemplateForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  validateIntegerField(state, "sortOrder", "Sort order", errors);
  validateIntegerField(state, "width", "Ширина", errors, { min: 1 });
  validateIntegerField(state, "height", "Высота", errors, { min: 1 });
  validateIntegerField(state, "depthMeters", "Глубина", errors, { min: 1 });
  validateNumberField(state, "difficultyStart", "Сложность от", errors, { min: 0.01 });
  validateNumberField(state, "difficultyEnd", "Сложность до", errors, { min: 0.01 });

  const completionVeinTypeId = formValue(state, "completionVeinTypeId");
  const completionRewardChestTypeId = formValue(state, "completionRewardChestTypeId");
  const depthRewardResourceId = formValue(state, "depthRewardResourceId");

  if (completionVeinTypeId && !veinIdSet(content).has(completionVeinTypeId)) {
    errors.push("Жила после расчистки не найдена.");
  }

  if (completionRewardChestTypeId && !rewardChestIdSet(content).has(completionRewardChestTypeId)) {
    errors.push("Сундук перехода не найден.");
  }

  if (depthRewardResourceId) {
    if (!resourceIdSet(content).has(depthRewardResourceId)) {
      errors.push("Ресурс награды за метр не найден.");
    }

    validateNumberField(state, "depthRewardAmountPerMeter", "Награда за метр", errors, { min: 0.01 });
    validateNumberField(state, "depthRewardMultiplier", "Множитель награды за метр", errors, { min: 0.01 });

    if (formValue(state, "depthRewardMaxAmount")) {
      validateIntegerField(state, "depthRewardMaxAmount", "Лимит награды за спуск", errors, { min: 1 });
    }
  }

  validateCellMapRows(state, content, errors);
}

function validateBuiltMineTypeForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  if (!formValue(state, "assetId").trim()) {
    errors.push("Asset ID обязателен.");
  }

  if (!veinIdSet(content).has(formValue(state, "sourceVeinType"))) {
    errors.push("Исходная жила не найдена.");
  }

  if (!resourceIdSet(content).has(formValue(state, "productionResourceId"))) {
    errors.push("Ресурс добычи не найден.");
  }

  validateNumberField(state, "baseProductionPerHour", "Добыча в час", errors, { min: 0.01 });
  validateNumberField(state, "baseCapacity", "Вместимость", errors, { min: 0.01 });
  validateIntegerField(state, "buildTimeSec", "Стройка", errors, { min: 0 });
  validateIntegerField(state, "upgradeMaxLevel", "Макс. уровень улучшения", errors, { min: 1 });
  validateNumberField(state, "upgradeProductionMultiplier", "Множитель добычи", errors, { min: 1 });
  validateNumberField(state, "upgradeCapacityMultiplier", "Множитель вместимости", errors, { min: 1 });
  validateResourceAmountRows(state, "buildCost", "Стоимость строительства", content, errors);
  validateMineUpgradeCostRows(state, "upgradeCost", "Стоимость улучшения", content, errors);
}

function validateRewardChestTypeForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  if (!rewardChestTierOptions.some((option) => option.value === formValue(state, "tier"))) {
    errors.push("Выбери корректный tier сундука.");
  }

  if (!formValue(state, "assetId").trim()) {
    errors.push("Asset ID обязателен.");
  }

  validateRewardRows(state, "reward", content, errors);
  validateBossCardDropBalanceFields(state, errors);
}

function validateBossCardForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  if (!formValue(state, "description").trim()) {
    errors.push("Описание RU обязательно.");
  }

  if (!formValue(state, "assetId").trim()) {
    errors.push("Asset ID обязателен.");
  }

  if (!bossCardRarityOptions.some((option) => option.value === formValue(state, "rarity"))) {
    errors.push("Выбери корректную редкость карты.");
  }

  if (!bossCardEffectOptions.some((option) => option.value === formValue(state, "effectType"))) {
    errors.push("Выбери корректный эффект карты.");
  }

  const resourceIds = resourceIdSet(content);

  if (!resourceIds.has(formValue(state, "cardResourceId"))) {
    errors.push("Ресурс-карта не найден.");
  }

  if (!resourceIds.has(formValue(state, "elixirResourceId"))) {
    errors.push("Ресурс эликсира не найден.");
  }

  validateNumberField(state, "valuePerLevel", "Бонус за уровень", errors, { min: 0.000001 });
  validateIntegerField(state, "maxLevel", "Max level", errors, { min: 1 });
  validateNumberField(state, "elixirCostMultiplier", "Множитель эликсира", errors, { min: 0.000001 });
  validateIntegerField(state, "sortOrder", "Sort order", errors);

  const upgradeCardAmounts = parsePositiveIntegerList(formValue(state, "upgradeCardAmounts"));

  if (upgradeCardAmounts.length === 0) {
    errors.push("Копии карт по уровням должны содержать хотя бы одно число.");
  }
}

function validateResourceAmountRows(
  state: EntityFormState,
  prefix: string,
  label: string,
  content: ContentBundle,
  errors: string[]
) {
  const count = formCount(state, `${prefix}Count`, 1);

  for (let index = 0; index < count; index += 1) {
    const amountField = `${prefix}Amount_${index}`;
    const resourceId = formValue(state, `${prefix}ResourceId_${index}`);
    const rawAmount = formValue(state, amountField);
    const amount = toNumber(rawAmount);

    if (!rawAmount.trim() || amount === 0) {
      continue;
    }

    validateIntegerField(state, amountField, `${label} ${index + 1}`, errors, { min: 1 });

    if (!resourceIdSet(content).has(resourceId)) {
      errors.push(`${label} ${index + 1}: ресурс не найден.`);
    }
  }
}

function validateMineUpgradeCostRows(
  state: EntityFormState,
  prefix: string,
  label: string,
  content: ContentBundle,
  errors: string[]
) {
  const count = formCount(state, `${prefix}Count`, 1);
  const resourceIds = resourceIdSet(content);

  for (let index = 0; index < count; index += 1) {
    const rowLabel = `${label} ${index + 1}`;
    const source = formValue(state, `${prefix}Source_${index}`);

    if (source !== upgradeCostProductionResourceValue && !resourceIds.has(source)) {
      errors.push(`${rowLabel}: ресурс не найден.`);
    }

    validateIntegerField(state, `${prefix}BaseAmount_${index}`, `${rowLabel}: база`, errors, { min: 1 });
    validateNumberField(state, `${prefix}LevelMultiplier_${index}`, `${rowLabel}: множитель уровня`, errors, { min: 0.01 });
    validateNumberField(state, `${prefix}LevelPower_${index}`, `${rowLabel}: степень`, errors, { min: 0 });
  }
}

function validateRewardRows(state: EntityFormState, prefix: string, content: ContentBundle, errors: string[]) {
  const count = formCount(state, `${prefix}Count`, 1);

  for (let index = 0; index < count; index += 1) {
    const rowLabel = `Награда ${index + 1}`;
    const min = toNumber(state[`${prefix}Min_${index}`]);
    const max = toNumber(state[`${prefix}Max_${index}`]);
    const chance = toNumber(state[`${prefix}ChancePercent_${index}`]);
    const resourceId = formValue(state, `${prefix}ResourceId_${index}`);

    validateIntegerField(state, `${prefix}Min_${index}`, `${rowLabel} min`, errors, { min: 0 });
    validateIntegerField(state, `${prefix}Max_${index}`, `${rowLabel} max`, errors, { min: 0 });
    validateNumberField(state, `${prefix}ChancePercent_${index}`, `${rowLabel} chance`, errors, { min: 0 });

    if (min > max) {
      errors.push(`${rowLabel}: min не может быть больше max.`);
    }

    if (chance > 100) {
      errors.push(`${rowLabel}: шанс не может быть больше 100%.`);
    }

    if (!resourceIdSet(content).has(resourceId)) {
      errors.push(`${rowLabel}: ресурс не найден.`);
    }
  }
}

function validateBossCardDropBalanceFields(state: EntityFormState, errors: string[]) {
  validateBossCardDropBalanceRow(state, "cardDropElixir", "Эликсир", errors);

  for (const option of bossCardDropRarityBalanceOptions) {
    validateBossCardDropBalanceRow(state, bossCardDropFieldPrefix(bossCardDropRaritySegment(option.value)), option.label, errors);
  }
}

function validateBossCardDropBalanceRow(state: EntityFormState, prefix: string, label: string, errors: string[]) {
  const min = toNumber(state[`${prefix}Min`]);
  const max = toNumber(state[`${prefix}Max`]);
  const chance = toNumber(state[`${prefix}ChancePercent`]);

  validateNumberField(state, `${prefix}ChancePercent`, `${label}: шанс`, errors, { min: 0 });
  validateIntegerField(state, `${prefix}Min`, `${label}: min`, errors, { min: 0 });
  validateIntegerField(state, `${prefix}Max`, `${label}: max`, errors, { min: 0 });

  if (chance > 100) {
    errors.push(`${label}: шанс не может быть больше 100%.`);
  }

  if (min > max) {
    errors.push(`${label}: min не может быть больше max.`);
  }
}

function validateCellMapRows(state: EntityFormState, content: ContentBundle, errors: string[]) {
  const mineHeight = Math.max(0, toInteger(state.height));
  const mineWidth = Math.max(0, toInteger(state.width));
  const blockIds = blockTypeIdSet(content);
  const rewardChestIds = rewardChestIdSet(content);

  for (let row = 0; row < mineHeight; row += 1) {
    for (let col = 0; col < mineWidth; col += 1) {
      const label = `Клетка ${row + 1}:${col + 1}`;
      const cell = getMineVisualCell(state, row, col, content);
      const blockTypeId = cell.blockTypeId;
      const hp = cell.hp;
      const rewardChestTypeId = cell.rewardChestTypeId;
      const special = cell.special;

      if (!blockIds.has(blockTypeId)) {
        errors.push(`${label}: выбери тип камня.`);
      }

      if (hp.trim()) {
        validateNumberField(state, mineCellField("Hp", row, col), `${label} HP`, errors, { min: 0.01 });
      }

      if (special && special !== "reward_chest") {
        errors.push(`${label}: особый тип некорректен.`);
      }

      if (special === "reward_chest" && !rewardChestIds.has(rewardChestTypeId)) {
        errors.push(`${label}: выбери сундук.`);
      }
    }
  }
}

function applyEntityForm(
  content: ContentBundle,
  kind: ContentEntityKind,
  selectedId: string,
  state: EntityFormState
): EntityDraftUpdate {
  if (kind === "blockTypes") {
    return applyBlockTypeForm(content, selectedId, state);
  }

  if (kind === "bossCards") {
    return applyBossCardForm(content, selectedId, state);
  }

  if (kind === "goblinGeneration") {
    return applyGoblinGenerationForm(content, selectedId, state);
  }

  if (kind === "goblinHut") {
    return applyGoblinHutForm(content, selectedId, state);
  }

  if (kind === "elevator") {
    return applyElevatorForm(content, selectedId, state);
  }

  if (kind === "mineTemplates") {
    return applyMineTemplateForm(content, selectedId, state);
  }

  if (kind === "rewardChestTypes") {
    return applyRewardChestTypeForm(content, selectedId, state);
  }

  return applyBuiltMineTypeForm(content, selectedId, state);
}

function applyBlockTypeForm(content: ContentBundle, selectedId: string, state: EntityFormState): EntityDraftUpdate {
  const current = content.blockTypes.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Блок не найден.");
  }

  const id = formValue(state, "id");
  const nameKey = stringField(current, "nameKey") || `block.${id}.name`;
  const nextBlockType: ContentRecord = {
    ...current,
    baseHp: toInteger(state.baseHp),
    id,
    nameKey,
    rewardTable: createRewardTableFromForm(state, "reward"),
    specialBehavior: formValue(state, "specialBehavior") || "none",
    tags: formValue(state, "tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    visualStateAssets: {
      breaking: formValue(state, "assetBreaking").trim(),
      cracked: formValue(state, "assetCracked").trim(),
      intact: formValue(state, "assetIntact").trim()
    }
  };

  return {
    entity: nextBlockType,
    entityId: selectedId,
    entityType: "blockType",
    localization: {
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Блок ${id} сохранен как draft.`
  };
}

function applyGoblinGenerationForm(content: ContentBundle, selectedId: string, state: EntityFormState): EntityDraftUpdate {
  const current = content.goblinGeneration ?? {};
  const id = formValue(state, "id") || "default";
  const nameKey = stringField(current, "nameKey") || "goblin_generation.name";
  const archetypes = parseJsonRecordArray(formValue(state, "archetypesJson"));

  if (!archetypes.ok) {
    throw new Error("Архетипы найма должны быть валидным JSON-массивом.");
  }

  return {
    entity: {
      id,
      nameKey,
      namePool: {
        names: parseLineList(formValue(state, "namePoolNames")),
        nicknames: parseLineList(formValue(state, "namePoolNicknames"))
      },
      archetypes: archetypes.value
    },
    entityId: selectedId,
    entityType: "goblinGeneration",
    localization: {
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Генерация гоблинов ${id} сохранена как draft.`
  };
}

function applyGoblinHutForm(content: ContentBundle, selectedId: string, state: EntityFormState): EntityDraftUpdate {
  const current = content.goblinHut;
  const id = formValue(state, "id") || "default";
  const nameKey = stringField(current, "nameKey") || "goblin_hut.name";
  const currentLevels = arrayField(current, "levels");
  const levels = createGoblinHutLevelsFromForm(state, currentLevels);
  const localization: Record<string, string> = {
    [nameKey]: formValue(state, "title").trim()
  };

  for (let index = 0; index < levels.length; index += 1) {
    const levelNameKey = stringField(levels[index] ?? {}, "nameKey") || `goblin_hut.level.${index + 1}.name`;
    localization[levelNameKey] = formValue(state, `levelTitle_${index}`).trim();
  }

  return {
    entity: {
      id,
      levels,
      nameKey
    },
    entityId: selectedId,
    entityType: "goblinHut",
    localization,
    message: `Хижина ${id} сохранена как draft.`
  };
}

function applyElevatorForm(content: ContentBundle, selectedId: string, state: EntityFormState): EntityDraftUpdate {
  const current = content.elevator;
  const id = formValue(state, "id") || "default";
  const nameKey = stringField(current, "nameKey") || "elevator.name";
  const currentLevels = arrayField(current, "levels");
  const levels = createElevatorLevelsFromForm(state, currentLevels);
  const localization: Record<string, string> = {
    [nameKey]: formValue(state, "title").trim()
  };

  for (let index = 0; index < levels.length; index += 1) {
    const level = numberField(levels[index] ?? {}, "level", index + 1);
    const levelNameKey = stringField(levels[index] ?? {}, "nameKey") || `elevator.level.${level}.name`;
    localization[levelNameKey] = formValue(state, `levelTitle_${index}`).trim();
  }

  return {
    entity: {
      id,
      levels,
      nameKey
    },
    entityId: selectedId,
    entityType: "elevator",
    localization,
    message: `Подъемник ${id} сохранен как draft.`
  };
}

function applyMineTemplateForm(content: ContentBundle, selectedId: string, state: EntityFormState): EntityDraftUpdate {
  const current = content.mineTemplates.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Рудник не найден.");
  }

  const id = formValue(state, "id");
  const displayNameKey = stringField(current, "displayNameKey") || `mine.${id}.name`;
  const nextMineTemplate: ContentRecord = {
    cellMap: createCellMapFromForm(state, content),
    depthMeters: toInteger(state.depthMeters),
    difficultyEnd: toNumber(state.difficultyEnd),
    difficultyStart: toNumber(state.difficultyStart),
    displayNameKey,
    height: toInteger(state.height),
    id,
    sortOrder: toInteger(state.sortOrder),
    width: toInteger(state.width)
  };

  setOptionalField(nextMineTemplate, "completionVeinTypeId", formValue(state, "completionVeinTypeId"));
  setOptionalField(nextMineTemplate, "completionRewardChestTypeId", formValue(state, "completionRewardChestTypeId"));

  const depthRewardResourceId = formValue(state, "depthRewardResourceId");
  if (depthRewardResourceId) {
    const maxAmount = toInteger(state.depthRewardMaxAmount);
    nextMineTemplate.depthProgressReward = {
      amountPerMeter: toNumber(state.depthRewardAmountPerMeter),
      multiplier: toNumber(state.depthRewardMultiplier) || 1,
      resourceId: depthRewardResourceId,
      ...(maxAmount > 0 ? { maxAmount } : {})
    };
  }

  return {
    entity: nextMineTemplate,
    entityId: selectedId,
    entityType: "mineTemplate",
    localization: {
      [displayNameKey]: formValue(state, "title").trim()
    },
    message: `Рудник ${id} сохранен как draft.`
  };
}

function applyBuiltMineTypeForm(content: ContentBundle, selectedId: string, state: EntityFormState): EntityDraftUpdate {
  const builtMineTypes = content.builtMineTypes ?? [];
  const current = builtMineTypes.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Тип шахты не найден.");
  }

  const id = formValue(state, "id");
  const nameKey = stringField(current, "nameKey") || `built_mine.${id}.name`;
  const nextBuiltMineType: ContentRecord = {
    ...current,
    assetId: formValue(state, "assetId").trim(),
    baseCapacity: toNumber(state.baseCapacity),
    baseProductionPerHour: toNumber(state.baseProductionPerHour),
    buildCost: createResourceAmountsFromForm(state, "buildCost"),
    buildTimeSec: toInteger(state.buildTimeSec),
    id,
    nameKey,
    productionResourceId: formValue(state, "productionResourceId"),
    sourceVeinType: formValue(state, "sourceVeinType"),
    upgrade: {
      capacityMultiplier: toNumber(state.upgradeCapacityMultiplier),
      cost: createMineUpgradeCostFromForm(state, "upgradeCost"),
      maxLevel: toInteger(state.upgradeMaxLevel),
      productionMultiplier: toNumber(state.upgradeProductionMultiplier)
    }
  };

  return {
    entity: nextBuiltMineType,
    entityId: selectedId,
    entityType: "builtMineType",
    localization: {
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Тип шахты ${id} сохранен как draft.`
  };
}

function applyRewardChestTypeForm(content: ContentBundle, selectedId: string, state: EntityFormState): EntityDraftUpdate {
  const rewardChestTypes = content.rewardChestTypes ?? [];
  const current = rewardChestTypes.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Сундук не найден.");
  }

  const id = formValue(state, "id");
  const nameKey = stringField(current, "nameKey") || `reward_chest.${id}.name`;
  const nextRewardChestType: ContentRecord = {
    ...current,
    assetId: formValue(state, "assetId").trim(),
    id,
    nameKey,
    rewardTable: createRewardTableFromForm(state, "reward"),
    tier: formValue(state, "tier")
  };

  return {
    entity: nextRewardChestType,
    entityId: selectedId,
    entityType: "rewardChestType",
    localization: {
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Сундук ${id} сохранен как draft.`
  };
}

function applyBossCardForm(content: ContentBundle, selectedId: string, state: EntityFormState): EntityDraftUpdate {
  const bossCards = content.bossCards ?? [];
  const current = bossCards.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Карта босса не найдена.");
  }

  const id = formValue(state, "id");
  const nameKey = stringField(current, "nameKey") || `boss_card.${id}.name`;
  const descriptionKey = stringField(current, "descriptionKey") || `boss_card.${id}.description`;
  const nextBossCard: ContentRecord = {
    ...current,
    assetId: formValue(state, "assetId").trim(),
    cardResourceId: formValue(state, "cardResourceId"),
    descriptionKey,
    effectType: formValue(state, "effectType"),
    elixirCostMultiplier: toNumber(state.elixirCostMultiplier),
    elixirResourceId: formValue(state, "elixirResourceId"),
    id,
    maxLevel: toInteger(state.maxLevel),
    nameKey,
    rarity: formValue(state, "rarity"),
    sortOrder: toInteger(state.sortOrder),
    upgradeCardAmounts: parsePositiveIntegerList(formValue(state, "upgradeCardAmounts")),
    valuePerLevel: toNumber(state.valuePerLevel)
  };

  return {
    entity: nextBossCard,
    entityId: selectedId,
    entityType: "bossCard",
    localization: {
      [descriptionKey]: formValue(state, "description").trim(),
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Карта босса ${id} сохранена как draft.`
  };
}

function createResourceAmountsFromForm(state: EntityFormState, prefix: string): Array<{ amount: number; resourceId: string }> {
  const count = formCount(state, `${prefix}Count`, 1);
  const rows: Array<{ amount: number; resourceId: string }> = [];

  for (let index = 0; index < count; index += 1) {
    const amount = toInteger(state[`${prefix}Amount_${index}`]);
    const resourceId = formValue(state, `${prefix}ResourceId_${index}`);

    if (amount > 0 && resourceId) {
      rows.push({ amount, resourceId });
    }
  }

  return rows;
}

function createGoblinHutLevelsFromForm(state: EntityFormState, currentLevels: ContentRecord[]): ContentRecord[] {
  const count = formCount(state, "levelCount", 1);

  return Array.from({ length: count }, (_, index) => {
    const level = toInteger(state[`levelLevel_${index}`]) || index + 1;
    const current = currentLevels.find((item) => numberField(item, "level", 0) === level) ?? currentLevels[index] ?? {};
    const nameKey = stringField(current, "nameKey") || `goblin_hut.level.${level}.name`;
    const unlockedClasses = formValue(state, `levelClasses_${index}`)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const upgradeCost = createGoblinHutUpgradeCostFromForm(state, index);
    const unlockRequirements = createGoblinHutUnlockRequirementsFromForm(state, index);

    return {
      hireCostMultiplier: percentToReductionMultiplier(toNumber(state[`levelHireDiscountPercent_${index}`])),
      level,
      maxHiredGoblins: toInteger(state[`levelMaxHired_${index}`]),
      nameKey,
      unlockRequirements,
      unlockedClasses,
      upgradeCost,
      upgradeCostMultiplier: percentToReductionMultiplier(toNumber(state[`levelUpgradeDiscountPercent_${index}`]))
    };
  }).sort((left, right) => numberField(left, "level", 0) - numberField(right, "level", 0));
}

function createGoblinHutUpgradeCostFromForm(state: EntityFormState, index: number): Array<{ amount: number; resourceId: string }> {
  const resources: Array<[string, string]> = [
    ["gold", "Gold"],
    ["stone", "Stone"],
    ["copper_ore", "Copper"],
    ["iron", "Iron"]
  ];

  return resources
    .map(([resourceId, suffix]) => ({
      amount: toInteger(state[`levelCost${suffix}_${index}`]),
      resourceId
    }))
    .filter((cost) => cost.amount > 0);
}

function createGoblinHutUnlockRequirementsFromForm(state: EntityFormState, index: number): ContentRecord[] {
  const requirements: ContentRecord[] = [];
  const requiredBuiltMines = toInteger(state[`levelRequiredBuiltMines_${index}`]);
  const requiredMineTemplateId = formValue(state, `levelRequiredMineTemplateId_${index}`);

  if (requiredBuiltMines > 0) {
    requirements.push({ type: "built_mines_count", value: requiredBuiltMines });
  }

  if (requiredMineTemplateId) {
    requirements.push({ type: "mine_completed", mineTemplateId: requiredMineTemplateId });
  }

  return requirements;
}

function createElevatorLevelsFromForm(state: EntityFormState, currentLevels: ContentRecord[]): ContentRecord[] {
  const count = formCount(state, "levelCount", 1);

  return Array.from({ length: count }, (_, index) => {
    const level = toInteger(state[`levelLevel_${index}`]) || index + 1;
    const current = currentLevels.find((item) => numberField(item, "level", 0) === level) ?? currentLevels[index] ?? {};
    const nameKey = stringField(current, "nameKey") || `elevator.level.${level}.name`;

    return {
      level,
      nameKey,
      dropDurationMs: toInteger(state[`levelDropDurationMs_${index}`]),
      offlineDamageMultiplier: Math.max(1, toNumber(state[`levelOfflineDamageMultiplier_${index}`])),
      platformSlots: toInteger(state[`levelPlatformSlots_${index}`]),
      stabilityPercent: Math.max(0, Math.min(100, toInteger(state[`levelStabilityPercent_${index}`]))),
      upgradeCost: createElevatorUpgradeCostFromForm(state, index),
      visualStage: Math.max(1, Math.min(5, toInteger(state[`levelVisualStage_${index}`]) || 1))
    };
  }).sort((left, right) => numberField(left, "level", 0) - numberField(right, "level", 0));
}

function createElevatorUpgradeCostFromForm(state: EntityFormState, index: number): Array<{ amount: number; resourceId: string }> {
  const resources: Array<[string, string]> = [
    ["gold", "Gold"],
    ["stone", "Stone"],
    ["copper_ore", "Copper"],
    ["iron", "Iron"],
    ["elixir", "Elixir"]
  ];

  return resources
    .map(([resourceId, suffix]) => ({
      amount: toInteger(state[`levelCost${suffix}_${index}`]),
      resourceId
    }))
    .filter((cost) => cost.amount > 0);
}

function createMineUpgradeCostFromForm(
  state: EntityFormState,
  prefix: string
): Array<{ baseAmount: number; levelMultiplier: number; levelPower: number; resourceId?: string; useProductionResource?: boolean }> {
  const count = formCount(state, `${prefix}Count`, 1);
  const rows: Array<{ baseAmount: number; levelMultiplier: number; levelPower: number; resourceId?: string; useProductionResource?: boolean }> = [];

  for (let index = 0; index < count; index += 1) {
    const source = formValue(state, `${prefix}Source_${index}`);
    const row = {
      baseAmount: toInteger(state[`${prefix}BaseAmount_${index}`]),
      levelMultiplier: toNumber(state[`${prefix}LevelMultiplier_${index}`]),
      levelPower: toNumber(state[`${prefix}LevelPower_${index}`])
    };

    if (row.baseAmount <= 0 || !source) {
      continue;
    }

    rows.push(
      source === upgradeCostProductionResourceValue
        ? {
            ...row,
            useProductionResource: true
          }
        : {
            ...row,
            resourceId: source
          }
    );
  }

  return rows;
}

function createRewardTableFromForm(state: EntityFormState, prefix: string): Array<{ chance: number; max: number; min: number; resourceId: string }> {
  const count = formCount(state, `${prefix}Count`, 1);
  const rows: Array<{ chance: number; max: number; min: number; resourceId: string }> = [];

  for (let index = 0; index < count; index += 1) {
    rows.push({
      chance: Math.round((toNumber(state[`${prefix}ChancePercent_${index}`]) / 100) * 1000) / 1000,
      max: toInteger(state[`${prefix}Max_${index}`]),
      min: toInteger(state[`${prefix}Min_${index}`]),
      resourceId: formValue(state, `${prefix}ResourceId_${index}`)
    });
  }

  return rows;
}

export function applyBossCardDropBalanceToFormState(
  content: ContentBundle,
  formState: EntityFormState,
  prefix = "reward"
): EntityFormState {
  const managedResourceIds = bossCardManagedRewardResourceIds(content);
  const preservedRows = createRewardTableFromForm(formState, prefix).filter(
    (row) => row.resourceId && !managedResourceIds.has(row.resourceId)
  );
  const nextRows = [...preservedRows, ...createBossCardDropBalanceRows(content, formState)];

  return createRewardTableFormState(prefix, nextRows, content);
}

function createBossCardDropBalanceRows(
  content: ContentBundle,
  state: EntityFormState
): Array<{ chance: number; max: number; min: number; resourceId: string }> {
  const rows: Array<{ chance: number; max: number; min: number; resourceId: string }> = [];
  const elixirResourceId = bossCardElixirResourceId(content);
  const elixirRow = createBossCardDropRewardRow(elixirResourceId, {
    chancePercent: toNumber(state.cardDropElixirChancePercent),
    max: toInteger(state.cardDropElixirMax),
    min: toInteger(state.cardDropElixirMin)
  });

  if (elixirRow) {
    rows.push(elixirRow);
  }

  const cardsByRarity = bossCardsByRarity(content);

  for (const option of bossCardDropRarityBalanceOptions) {
    const segment = bossCardDropRaritySegment(option.value);
    const chancePercent = toNumber(state[bossCardDropField(segment, "ChancePercent")]);
    const min = toInteger(state[bossCardDropField(segment, "Min")]);
    const max = toInteger(state[bossCardDropField(segment, "Max")]);

    for (const card of cardsByRarity.get(option.value) ?? []) {
      const row = createBossCardDropRewardRow(stringField(card, "cardResourceId"), {
        chancePercent,
        max,
        min
      });

      if (row) {
        rows.push(row);
      }
    }
  }

  return rows;
}

function createBossCardDropRewardRow(
  resourceId: string,
  balance: { chancePercent: number; max: number; min: number }
): { chance: number; max: number; min: number; resourceId: string } | null {
  if (!resourceId || balance.chancePercent <= 0 || balance.max <= 0) {
    return null;
  }

  return {
    chance: Math.round((balance.chancePercent / 100) * 1000) / 1000,
    max: balance.max,
    min: balance.min,
    resourceId
  };
}

function createCellMapFromForm(state: EntityFormState, content: ContentBundle): ContentRecord[] {
  const height = Math.max(1, toInteger(state.height));
  const width = Math.max(1, toInteger(state.width));
  const cells: ContentRecord[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const hp = toNumber(state[mineCellField("Hp", row, col)]);
      const rewardChestTypeId = formValue(state, mineCellField("RewardChestTypeId", row, col));
      const special = formValue(state, mineCellField("Special", row, col));
      const cell: ContentRecord = {
        blockTypeId: formValue(state, mineCellField("Block", row, col)) || firstBlockTypeId(content),
        col,
        row
      };

      if (hp > 0) {
        cell.hp = hp;
      }

      if (special) {
        cell.special = special;
      }

      if (special === "reward_chest" && rewardChestTypeId) {
        cell.rewardChestTypeId = rewardChestTypeId;
      }

      cells.push(cell);
    }
  }

  return cells;
}

function defaultGoblinGenerationEquipmentSlots(goblinClass: string): string[] {
  if (goblinClass === "collector") {
    return ["ledger"];
  }

  if (goblinClass === "builder" || goblinClass === "foreman") {
    return ["whistle"];
  }

  return ["tool"];
}

function defaultGoblinGenerationRarityWeights(): ContentRecord[] {
  return [
    { rarity: "common", statMultiplier: 1, weight: 78 },
    { rarity: "rare", statMultiplier: 1.15, weight: 18 },
    { rarity: "epic", statMultiplier: 1.35, weight: 3.5 },
    { rarity: "legendary", statMultiplier: 1.6, weight: 0.5 }
  ];
}

function defaultGoblinGenerationAbility(goblinClass: string): ContentRecord {
  return {
    descriptionKey: `ability.random_${goblinClass}_contract.description`,
    effects: [],
    id: `random_${goblinClass}_ability`,
    nameKey: `ability.random_${goblinClass}_contract.name`
  };
}

function defaultGoblinGenerationLeveling(goblinClass: string): ContentRecord {
  const isCollector = goblinClass === "collector";
  const isForeman = goblinClass === "foreman";

  return {
    autoCollectSlotsPerLevel: isCollector ? 1 : 0,
    buildCostMultiplierPerLevel: isForeman ? -0.01 : 0,
    buildTimeMultiplierPerLevel: isForeman ? -0.02 : 0,
    cost: [],
    maxLevel: 5,
    mineCapacityMultiplierPerLevel: isCollector ? 0.03 : 0,
    mineProductionMultiplierPerLevel: isCollector ? 0.02 : 0,
    offlineRelocationSlotsPerLevel: isForeman ? 1 : 0,
    statGrowthPerLevel: {
      loyalty: 0.4,
      luck: 0.25,
      speed: 0.35,
      strength: goblinClass === "miner" ? 0.7 : 0.3
    }
  };
}

function defaultGoblinGenerationStatRanges(): ContentRecord {
  return {
    loyalty: { max: 6, min: 3 },
    luck: { max: 4, min: 1 },
    speed: { max: 6, min: 3 },
    strength: { max: 8, min: 4 }
  };
}

function normalizedGoblinGenerationRarityWeights(archetype: ContentRecord): ContentRecord[] {
  const rows = arrayField(archetype, "rarityWeights");

  return rarityOptions.map((option) => {
    const existing = rows.find((row) => stringField(row, "rarity") === option.value);

    return existing ?? { rarity: option.value, statMultiplier: 1, weight: 0 };
  });
}

function goblinGenerationTraitLines(traits: ContentRecord[]): string {
  return traits
    .map((trait) => [stringField(trait, "id"), numberString(numberField(trait, "weight", 1)), stringField(trait, "nameKey")].filter(Boolean).join(":"))
    .join("\n");
}

function parseGoblinGenerationTraitLines(value: string): ContentRecord[] {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id = "", weight = "1", nameKey = ""] = line.split(":").map((part) => part.trim());
      const trait: ContentRecord = {
        id,
        weight: toNumber(weight) || 1
      };

      if (nameKey) {
        trait.nameKey = nameKey;
      }

      return trait;
    });
}

function setOptionalField(record: ContentRecord, key: string, value: string) {
  if (value) {
    record[key] = value;
    return;
  }

  Reflect.deleteProperty(record, key);
}

function validateIntegerField(
  state: EntityFormState,
  field: string,
  label: string,
  errors: string[],
  options: { max?: number; min?: number } = {}
) {
  const value = toNumber(state[field]);

  if (!Number.isInteger(value)) {
    errors.push(`${label}: нужно целое число.`);
    return;
  }

  if (options.min !== undefined && value < options.min) {
    errors.push(`${label}: минимум ${options.min}.`);
  }

  if (options.max !== undefined && value > options.max) {
    errors.push(`${label}: максимум ${options.max}.`);
  }
}

function validateNumberField(
  state: EntityFormState,
  field: string,
  label: string,
  errors: string[],
  options: { min?: number } = {}
) {
  const value = toNumber(state[field]);

  if (!Number.isFinite(value)) {
    errors.push(`${label}: нужно число.`);
    return;
  }

  if (options.min !== undefined && value < options.min) {
    errors.push(`${label}: минимум ${options.min}.`);
  }
}

function resourceSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return content.resources.map((resource) => ({
    label: contentEntityTitle(resource, content.localization?.ru ?? {}),
    value: stringField(resource, "id")
  }));
}

function resourceLabel(content: ContentBundle, resourceId: string): string {
  const resource = content.resources.find((item) => stringField(item, "id") === resourceId);

  return resource ? contentEntityTitle(resource, content.localization?.ru ?? {}) : resourceId;
}

function bossCardElixirResourceId(content: ContentBundle): string {
  return stringField((content.bossCards ?? [])[0] ?? {}, "elixirResourceId") || findResourceId(content, "elixir");
}

function bossCardsByRarity(content: ContentBundle): Map<string, ContentRecord[]> {
  const cardsByRarity = new Map<string, ContentRecord[]>();

  for (const card of content.bossCards ?? []) {
    const rarity = stringField(card, "rarity") || "common";
    cardsByRarity.set(rarity, [...(cardsByRarity.get(rarity) ?? []), card]);
  }

  return cardsByRarity;
}

function bossCardManagedRewardResourceIds(content: ContentBundle): Set<string> {
  return new Set([
    bossCardElixirResourceId(content),
    ...(content.bossCards ?? []).map((card) => stringField(card, "cardResourceId")).filter(Boolean)
  ]);
}

function rewardRowByResourceId(rows: ContentRecord[], resourceId: string): ContentRecord | undefined {
  return rows.find((row) => stringField(row, "resourceId") === resourceId);
}

function rewardChancePercentString(row: ContentRecord | undefined, fallback: number): string {
  return numberString(Math.round(numberField(row ?? {}, "chance", fallback / 100) * 1000) / 10);
}

function bossCardDropRaritySegment(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function bossCardDropField(segment: string, suffix: "ChancePercent" | "Max" | "Min"): string {
  return `${bossCardDropFieldPrefix(segment)}${suffix}`;
}

function bossCardDropFieldPrefix(segment: string): string {
  return `cardDrop${segment}`;
}

function mineUpgradeCostSourceOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return [
    {
      label: "Ресурс добычи шахты",
      value: upgradeCostProductionResourceValue
    },
    ...resourceSelectOptions(content)
  ];
}

function veinSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return (content.veinTypes ?? []).map((veinType) => ({
    label: contentEntityTitle(veinType, content.localization?.ru ?? {}),
    value: stringField(veinType, "id")
  }));
}

function rewardChestSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return (content.rewardChestTypes ?? []).map((chestType) => ({
    label: contentEntityTitle(chestType, content.localization?.ru ?? {}),
    value: stringField(chestType, "id")
  }));
}

function blockTypeSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return content.blockTypes.map((blockType) => ({
    label: contentEntityTitle(blockType, content.localization?.ru ?? {}),
    value: stringField(blockType, "id")
  }));
}

function mineTemplateSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return content.mineTemplates.map((mineTemplate) => ({
    label: contentEntityTitle(mineTemplate, content.localization?.ru ?? {}),
    value: stringField(mineTemplate, "id")
  }));
}

function localizationValue(content: ContentBundle, key: string): string {
  return key ? content.localization?.ru?.[key] ?? "" : "";
}

function recordField(record: ContentRecord, key: string): ContentRecord {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function arrayField(record: ContentRecord, key: string): ContentRecord[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function arrayStringField(record: ContentRecord, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function recordAt(items: ContentRecord[], index: number): ContentRecord {
  return items[index] ?? {};
}

function resourceAmountField(rows: ContentRecord[], resourceId: string): number {
  const row = rows.find((item) => stringField(item, "resourceId") === resourceId);
  return numberField(row ?? {}, "amount", 0);
}

function numberField(record: ContentRecord, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numberString(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

function formValue(state: EntityFormState, field: string): string {
  return state[field] ?? "";
}

function formCount(state: EntityFormState, field: string, fallback: number): number {
  return Math.max(0, toInteger(state[field] ?? String(fallback)));
}

function removeIndexedFormRow(
  state: EntityFormState,
  prefix: string,
  index: number,
  fieldSuffixes: string[],
  count: number
): EntityFormState {
  const next: EntityFormState = {
    [`${prefix}Count`]: String(Math.max(0, count - 1))
  };

  for (let rowIndex = index; rowIndex < count - 1; rowIndex += 1) {
    for (const suffix of fieldSuffixes) {
      next[`${prefix}${suffix}_${rowIndex}`] = formValue(state, `${prefix}${suffix}_${rowIndex + 1}`);
    }
  }

  for (const suffix of fieldSuffixes) {
    next[`${prefix}${suffix}_${count - 1}`] = "";
  }

  return next;
}

function multiplierReductionToPercent(value: number): number {
  return Math.max(0, Math.round((1 - value) * 100));
}

function percentToReductionMultiplier(percent: number): number {
  return Math.round(Math.max(0.01, 1 - Math.max(0, percent) / 100) * 1000) / 1000;
}

function parsePositiveIntegerList(value: string): number[] {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function parseLineList(value: string): string[] {
  return value
    .split(/\r?\n/gu)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonRecordArray(value: string): { ok: true; value: ContentRecord[] } | { ok: false } {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed) || parsed.some((item) => !isRecord(item))) {
      return { ok: false };
    }

    return { ok: true, value: parsed };
  } catch {
    return { ok: false };
  }
}

function parseJsonRecord(value: string): { ok: true; value: ContentRecord } | { ok: false } {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!isRecord(parsed)) {
      return { ok: false };
    }

    return { ok: true, value: parsed };
  } catch {
    return { ok: false };
  }
}

function toNumber(value: string | undefined): number {
  return value === undefined || value.trim() === "" ? 0 : Number(value);
}

function toInteger(value: string | undefined): number {
  return Math.trunc(toNumber(value));
}

function resourceIdSet(content: ContentBundle): Set<string> {
  return new Set(content.resources.map((resource) => stringField(resource, "id")));
}

function blockTypeIdSet(content: ContentBundle): Set<string> {
  return new Set(content.blockTypes.map((blockType) => stringField(blockType, "id")));
}

function veinIdSet(content: ContentBundle): Set<string> {
  return new Set((content.veinTypes ?? []).map((veinType) => stringField(veinType, "id")));
}

function rewardChestIdSet(content: ContentBundle): Set<string> {
  return new Set((content.rewardChestTypes ?? []).map((chestType) => stringField(chestType, "id")));
}

function statLabel(field: string): string {
  switch (field) {
    case "loyalty":
      return "Лояльность";
    case "luck":
      return "Удача";
    case "speed":
      return "Скорость";
    default:
      return "Сила";
  }
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

function readAdminRoute(): { contentVersionSlug: string | null; section: AdminSection } {
  return readAdminRoutePath(window.location.pathname);
}

export function readAdminRoutePath(path: string): { contentVersionSlug: string | null; section: AdminSection } {
  const normalizedPath = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;

  if (normalizedPath === "/admin/content" || normalizedPath.startsWith("/admin/content/")) {
    const contentVersionSlug = normalizedPath.startsWith("/admin/content/")
      ? decodeURIComponent(normalizedPath.slice("/admin/content/".length))
      : null;

    return {
      contentVersionSlug: contentVersionSlug || null,
      section: "content"
    };
  }

  if (normalizedPath === "/admin/credentials") {
    return {
      contentVersionSlug: null,
      section: "credentials"
    };
  }

  return {
    contentVersionSlug: null,
    section: "dashboard"
  };
}

export function adminSectionPath(section: AdminSection): string {
  switch (section) {
    case "content":
      return "/admin/content";
    case "credentials":
      return "/admin/credentials";
    default:
      return "/admin/";
  }
}

export function adminContentVersionPath(version: string): string {
  return `/admin/content/${encodeURIComponent(version)}`;
}

async function apiRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT";
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
    const errorPayload = payload as { error?: string; validation?: { errors?: string[] } };
    throw new ApiRequestError(
      messageForApiError(errorPayload.error),
      Array.isArray(errorPayload.validation?.errors) ? errorPayload.validation.errors : []
    );
  }

  return payload as T;
}

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly validationErrors: string[] = []
  ) {
    super(message);
  }
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
    case "invalid_asset_payload":
      return "Проверь Asset ID и формат файла.";
    case "invalid_asset_file":
      return "Файл рендера не подходит или больше 5 MB.";
    case "asset_not_found":
      return "Ассет не найден.";
    case "invalid_session":
      return "Сессия истекла. Войди заново.";
    case "password_setup_required":
      return "Сначала нужно установить пароль.";
    case "content_version_not_found":
      return "Версия контента не найдена.";
    case "version_not_editable":
      return "Эту версию уже нельзя редактировать.";
    case "invalid_content":
      return "Контент не прошел проверку схемы.";
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

function replaceContentVersion(versions: ContentVersion[], nextVersion: ContentVersion): ContentVersion[] {
  return versions
    .map((version) => (version.id === nextVersion.id ? nextVersion : version))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
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
