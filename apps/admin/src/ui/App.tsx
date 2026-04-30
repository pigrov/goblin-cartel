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
  Save,
  Send,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

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
type AdminSection = "dashboard" | "content" | "credentials";
type ContentEntityKind = "goblins" | "mineTemplates" | "builtMineTypes";
type ContentEntityApiKind = "goblin" | "mineTemplate" | "builtMineType";
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
  mineTemplates: ContentRecord[];
  goblins: ContentRecord[];
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
  { value: "goblins", label: "Гоблины" },
  { value: "mineTemplates", label: "Рудники" },
  { value: "builtMineTypes", label: "Типы шахт" }
];

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

const seedModeOptions = [
  { value: "fixed", label: "Fixed" },
  { value: "random", label: "Random" },
  { value: "playerBased", label: "Player based" }
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

      if (!selectedContentVersion && response.versions[0]) {
        await loadContentVersion(response.versions[0].id);
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
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "Не удалось создать версию.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveContent() {
    if (!sessionToken || !selectedContentVersion) {
      return;
    }

    const parsed = parseContentJson();

    if (!parsed.ok) {
      return;
    }

    setBusy(true);
    setContentMessage(null);
    setContentErrors([]);

    try {
      const response = await apiRequest<{ version: ContentVersion; content: ContentBundle }>(
        `/admin/content/versions/${selectedContentVersion.id}/content`,
        {
          method: "PUT",
          token: sessionToken,
          body: {
            content: parsed.content
          }
        }
      );
      setSelectedContentVersion(response.version);
      setContentVersions((current) => replaceContentVersion(current, response.version));
      setContentJson(JSON.stringify(response.content, null, 2));
      setContentMessage("Контент сохранен как draft.");
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "Не удалось сохранить контент.");
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

  function parseContentJson(): { ok: true; content: ContentBundle } | { ok: false } {
    try {
      return {
        ok: true,
        content: JSON.parse(contentJson) as ContentBundle
      };
    } catch {
      setContentMessage("JSON не читается. Проверь синтаксис.");
      return { ok: false };
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
          <button
            className={activeSection === "content" ? "active" : ""}
            onClick={() => setActiveSection("content")}
            type="button"
          >
            Content
          </button>
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
            onContentJsonChange={setContentJson}
            onContentNotesChange={setContentNotes}
            onContentVersionNameChange={setContentVersionName}
            onCreateContentVersion={handleCreateContentVersion}
            onPublishContent={handlePublishContent}
            onSaveContent={handleSaveContent}
            onSaveContentEntity={handleSaveContentEntity}
            onSelectContentVersion={loadContentVersion}
            onValidateContent={handleValidateContent}
            selectedContentVersion={selectedContentVersion}
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
  onContentJsonChange: (value: string) => void;
  onContentNotesChange: (value: string) => void;
  onContentVersionNameChange: (value: string) => void;
  onCreateContentVersion: (event: FormEvent<HTMLFormElement>) => void;
  onPublishContent: () => void;
  onSaveContent: () => void;
  onSaveContentEntity: (update: EntityDraftUpdate) => Promise<void>;
  onSelectContentVersion: (id: string) => void;
  onValidateContent: () => void;
  selectedContentVersion: ContentVersion | null;
}) {
  const [draftToolMessage, setDraftToolMessage] = useState<string | null>(null);
  const [entityEditorKind, setEntityEditorKind] = useState<ContentEntityKind>("goblins");
  const [selectedEntityId, setSelectedEntityId] = useState("");
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

  function applyDraftTool(builder: (content: ContentBundle) => { content: ContentBundle; message: string }) {
    if (!canEdit || !props.selectedContentVersion) {
      return;
    }

    if (!contentPreview) {
      setDraftToolMessage("JSON сейчас не читается, сначала поправь синтаксис.");
      return;
    }

    try {
      const result = builder(contentPreview);
      props.onContentJsonChange(JSON.stringify(result.content, null, 2));
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

  return (
    <section className="content-layout">
      <aside className="content-side">
        <form className="gc-panel content-create" onSubmit={props.onCreateContentVersion}>
          <h2>Новая версия</h2>
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

        <section className="content-version-list">
          {props.contentVersions.length === 0 ? (
            <article className="gc-panel content-empty">
              <FileJson size={20} />
              <span>Версий пока нет</span>
            </article>
          ) : (
            props.contentVersions.map((version) => (
              <button
                className={props.selectedContentVersion?.id === version.id ? "content-version active" : "content-version"}
                key={version.id}
                onClick={() => props.onSelectContentVersion(version.id)}
                type="button"
              >
                <strong>{version.version}</strong>
                <span>{version.status}</span>
              </button>
            ))
          )}
        </section>
      </aside>

      <section className="content-editor">
        <div className="gc-panel content-toolbar">
          <div>
            <strong>{props.selectedContentVersion?.version ?? "Версия не выбрана"}</strong>
            <span>{props.selectedContentVersion ? formatDateTime(props.selectedContentVersion.updatedAt) : ""}</span>
          </div>
          <div className="content-actions">
            <button disabled={!canEdit || props.busy || props.contentLoading} onClick={props.onSaveContent} type="button">
              <Save size={17} />
              Save
            </button>
            <button disabled={!props.selectedContentVersion || props.busy} onClick={props.onValidateContent} type="button">
              <CheckCircle2 size={17} />
              Validate
            </button>
            <button disabled={!props.selectedContentVersion || props.busy} onClick={props.onPublishContent} type="button">
              <Send size={17} />
              Publish
            </button>
          </div>
        </div>

        <section className="gc-panel content-entity-tools">
          <header>
            <div>
              <strong>Сущности контента</strong>
              <span>{contentPreview ? "Формы сохраняют draft через серверную проверку" : "JSON пока не разобран"}</span>
            </div>
            <div className="content-template-actions">
              <button
                disabled={!canEdit || !props.selectedContentVersion}
                onClick={() => applyDraftTool(addDraftGoblinTemplate)}
                type="button"
              >
                <PlusCircle size={16} />
                Гоблин
              </button>
              <button
                disabled={!canEdit || !props.selectedContentVersion}
                onClick={() => applyDraftTool(addDraftMineTemplate)}
                type="button"
              >
                <PlusCircle size={16} />
                Рудник
              </button>
              <button
                disabled={!canEdit || !props.selectedContentVersion}
                onClick={() => applyDraftTool(addDraftBuiltMineTypeTemplate)}
                type="button"
              >
                <PlusCircle size={16} />
                Тип шахты
              </button>
            </div>
          </header>

          <div className="content-entity-kpis" aria-label="Счетчики сущностей">
            <ContentEntityKpi label="Ресурсы" value={contentEntityCount(contentPreview, "resources")} />
            <ContentEntityKpi label="Блоки" value={contentEntityCount(contentPreview, "blockTypes")} />
            <ContentEntityKpi label="Жилы" value={contentEntityCount(contentPreview, "veinTypes")} />
            <ContentEntityKpi label="Типы шахт" value={contentEntityCount(contentPreview, "builtMineTypes")} />
            <ContentEntityKpi label="Рудники" value={contentEntityCount(contentPreview, "mineTemplates")} />
            <ContentEntityKpi label="Гоблины" value={contentEntityCount(contentPreview, "goblins")} />
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
            />
          ) : null}

          {contentPreview ? <ContentEntityPreview content={contentPreview} /> : null}
          {draftToolMessage ? <p className="content-tool-message">{draftToolMessage}</p> : null}
        </section>

        <textarea
          className="content-json"
          disabled={!props.selectedContentVersion || !canEdit}
          onChange={(event) => props.onContentJsonChange(event.target.value)}
          spellCheck={false}
          value={props.contentJson}
        />

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
            renderEntityFields(props.kind, formState, props.content, updateField)
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
  updateField: (field: string, value: string) => void
) {
  if (kind === "goblins") {
    return (
      <>
        <ContentTextField disabled label="ID" name="id" onChange={updateField} value={formState.id} />
        <ContentTextField label="Имя RU" name="title" onChange={updateField} value={formState.title} />
        <ContentTextAreaField label="Описание RU" name="description" onChange={updateField} value={formState.description} />
        <div className="content-form-grid">
          <ContentSelectField label="Класс" name="class" onChange={updateField} options={goblinClassOptions} value={formState.class} />
          <ContentSelectField
            label="Специализация"
            name="specialization"
            onChange={updateField}
            options={goblinSpecializationOptions}
            value={formState.specialization}
          />
          <ContentSelectField label="Редкость" name="rarity" onChange={updateField} options={rarityOptions} value={formState.rarity} />
          <ContentTextField label="Sort order" name="sortOrder" onChange={updateField} type="number" value={formState.sortOrder} />
        </div>
        <ContentTextField label="Asset ID" name="assetId" onChange={updateField} value={formState.assetId} />
        <div className="content-form-grid">
          <ContentTextField label="Сила" name="strength" onChange={updateField} type="number" value={formState.strength} />
          <ContentTextField label="Скорость" name="speed" onChange={updateField} type="number" value={formState.speed} />
          <ContentTextField label="Удача" name="luck" onChange={updateField} type="number" value={formState.luck} />
          <ContentTextField label="Лояльность" name="loyalty" onChange={updateField} type="number" value={formState.loyalty} />
        </div>
        <ContentTextField label="Умение RU" name="abilityTitle" onChange={updateField} value={formState.abilityTitle} />
        <ContentTextAreaField label="Описание умения RU" name="abilityDescription" onChange={updateField} value={formState.abilityDescription} />
        <div className="content-form-grid">
          <ContentTextField label="Слоты автосбора" name="autoCollectSlots" onChange={updateField} type="number" value={formState.autoCollectSlots} />
          <ContentTextField label="Бонус вместимости %" name="capacityBonusPercent" onChange={updateField} type="number" value={formState.capacityBonusPercent} />
          <ContentSelectField
            label="Ресурс бонуса добычи"
            name="productionBonusResourceId"
            onChange={updateField}
            options={[{ value: "", label: "Любой ресурс" }, ...resourceSelectOptions(content)]}
            value={formState.productionBonusResourceId}
          />
          <ContentTextField label="Бонус добычи %" name="productionBonusPercent" onChange={updateField} type="number" value={formState.productionBonusPercent} />
        </div>
        <div className="content-form-grid">
          <ContentSelectField label="Стоимость найма" name="hireCostResourceId" onChange={updateField} options={resourceSelectOptions(content)} value={formState.hireCostResourceId} />
          <ContentTextField label="Кол-во" name="hireCostAmount" onChange={updateField} type="number" value={formState.hireCostAmount} />
        </div>
      </>
    );
  }

  if (kind === "mineTemplates") {
    return (
      <>
        <ContentTextField disabled label="ID" name="id" onChange={updateField} value={formState.id} />
        <ContentTextField label="Название RU" name="title" onChange={updateField} value={formState.title} />
        <div className="content-form-grid">
          <ContentTextField label="Sort order" name="sortOrder" onChange={updateField} type="number" value={formState.sortOrder} />
          <ContentTextField label="Ширина" name="width" onChange={updateField} type="number" value={formState.width} />
          <ContentTextField label="Высота" name="height" onChange={updateField} type="number" value={formState.height} />
          <ContentTextField label="Глубина, м" name="depthMeters" onChange={updateField} type="number" value={formState.depthMeters} />
          <ContentTextField label="Сложность" name="difficulty" onChange={updateField} type="number" value={formState.difficulty} />
          <ContentSelectField label="Seed mode" name="seedMode" onChange={updateField} options={seedModeOptions} value={formState.seedMode} />
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
      <div className="content-form-grid">
        <ContentSelectField label="Стоимость 1" name="buildCostResourceId1" onChange={updateField} options={resourceSelectOptions(content)} value={formState.buildCostResourceId1} />
        <ContentTextField label="Кол-во 1" name="buildCostAmount1" onChange={updateField} type="number" value={formState.buildCostAmount1} />
        <ContentSelectField label="Стоимость 2" name="buildCostResourceId2" onChange={updateField} options={[{ value: "", label: "Не задана" }, ...resourceSelectOptions(content)]} value={formState.buildCostResourceId2} />
        <ContentTextField label="Кол-во 2" name="buildCostAmount2" onChange={updateField} type="number" value={formState.buildCostAmount2} />
      </div>
    </>
  );
}

function ContentTextField(props: {
  disabled?: boolean;
  label: string;
  name: string;
  onChange: (name: string, value: string) => void;
  type?: "number" | "text";
  value?: string;
}) {
  return (
    <label>
      {props.label}
      <input
        disabled={props.disabled}
        onChange={(event) => props.onChange(props.name, event.target.value)}
        type={props.type ?? "text"}
        value={props.value ?? ""}
      />
    </label>
  );
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
  const goblins = props.content.goblins.slice(-3).reverse();
  const mines = props.content.mineTemplates.slice(-3).reverse();
  const builtMineTypes = (props.content.builtMineTypes ?? []).slice(-3).reverse();

  return (
    <div className="content-entity-preview">
      <ContentEntityColumn items={goblins} label="Последние гоблины" localization={ru} />
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

function addDraftGoblinTemplate(content: ContentBundle): { content: ContentBundle; message: string } {
  const id = uniqueContentId("collector_draft", content.goblins);
  const nameKey = `goblin.${id}.name`;
  const descriptionKey = `goblin.${id}.description`;
  const abilityNameKey = `ability.${id}.name`;
  const abilityDescriptionKey = `ability.${id}.description`;
  const goldResourceId = findResourceId(content, "gold");
  const copperResourceId = findResourceId(content, "copper_ore");

  return {
    content: {
      ...content,
      goblins: [
        ...content.goblins,
        {
          id,
          nameKey,
          descriptionKey,
          class: "collector",
          specialization: "warehouse_keeper",
          clan: "neutral",
          rarity: "common",
          assetId: `goblin_${id}_v1`,
          baseStats: {
            strength: 2,
            speed: 4,
            luck: 5,
            loyalty: 6
          },
          ability: {
            id: `${id}_auto_collect`,
            nameKey: abilityNameKey,
            descriptionKey: abilityDescriptionKey,
            effects: [
              { type: "auto_collect_slots", value: 1 },
              { type: "mine_capacity_multiplier", value: 1.1 }
            ]
          },
          hireCost: [{ resourceId: goldResourceId, amount: 1000 }],
          unlockRequirements: copperResourceId ? [{ type: "resource_collected", resourceId: copperResourceId, amount: 1 }] : [],
          sortOrder: nextSortOrder(content.goblins)
        }
      ],
      localization: addRuLocalization(content.localization, {
        [nameKey]: "Новый сборщик",
        [descriptionKey]: "Черновой гоблин для настройки в админке.",
        [abilityNameKey]: "Черновой автосбор",
        [abilityDescriptionKey]: "Открывает один слот автосбора и немного увеличивает вместимость шахты."
      })
    },
    message: `Добавлен шаблон гоблина ${id}. Сохрани и провалидируй draft перед публикацией.`
  };
}

function addDraftMineTemplate(content: ContentBundle): { content: ContentBundle; message: string } {
  const source = content.mineTemplates[content.mineTemplates.length - 1];

  if (!source) {
    throw new Error("Нужен хотя бы один существующий рудник, чтобы создать шаблон.");
  }

  const id = uniqueContentId("draft_mine", content.mineTemplates);
  const displayNameKey = `mine.${id}.name`;

  return {
    content: {
      ...content,
      mineTemplates: [
        ...content.mineTemplates,
        {
          ...cloneRecord(source),
          id,
          displayNameKey,
          sortOrder: nextSortOrder(content.mineTemplates),
          difficulty: Number(source.difficulty ?? 1) + 0.15
        }
      ],
      localization: addRuLocalization(content.localization, {
        [displayNameKey]: "Новый рудник"
      })
    },
    message: `Добавлен шаблон рудника ${id}. Проверь жилу, сундук и слои перед публикацией.`
  };
}

function addDraftBuiltMineTypeTemplate(content: ContentBundle): { content: ContentBundle; message: string } {
  const builtMineTypes = content.builtMineTypes ?? [];
  const source = builtMineTypes[builtMineTypes.length - 1];

  if (!source) {
    throw new Error("Нужен хотя бы один тип шахты, чтобы создать шаблон.");
  }

  const id = uniqueContentId("draft_built_mine", builtMineTypes);
  const nameKey = `built_mine.${id}.name`;

  return {
    content: {
      ...content,
      builtMineTypes: [
        ...builtMineTypes,
        {
          ...cloneRecord(source),
          id,
          nameKey,
          assetId: `built_mine_${id}_v1`
        }
      ],
      localization: addRuLocalization(content.localization, {
        [nameKey]: "Новая постоянная шахта"
      })
    },
    message: `Добавлен шаблон типа шахты ${id}. Проверь ресурс добычи, жилу и стоимость.`
  };
}

function isContentBundleLike(value: unknown): value is ContentBundle {
  return (
    isRecord(value) &&
    Array.isArray(value.resources) &&
    Array.isArray(value.blockTypes) &&
    Array.isArray(value.mineTemplates) &&
    Array.isArray(value.goblins)
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
    case "builtMineTypes":
      return content.builtMineTypes ?? [];
    case "mineTemplates":
      return content.mineTemplates;
    default:
      return content.goblins;
  }
}

function createEntityFormState(kind: ContentEntityKind, entity: ContentRecord, content: ContentBundle): EntityFormState {
  if (kind === "goblins") {
    return createGoblinFormState(entity, content);
  }

  if (kind === "mineTemplates") {
    return createMineTemplateFormState(entity, content);
  }

  return createBuiltMineTypeFormState(entity, content);
}

function createGoblinFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const ability = recordField(entity, "ability");
  const stats = recordField(entity, "baseStats");
  const effects = arrayField(ability, "effects");
  const hireCost = arrayField(entity, "hireCost");
  const firstHireCost = recordAt(hireCost, 0);
  const capacityEffect = findEffect(effects, "mine_capacity_multiplier");
  const productionEffect = findEffect(effects, "mine_production_multiplier");

  return {
    abilityDescription: localizationValue(content, stringField(ability, "descriptionKey")),
    abilityTitle: localizationValue(content, stringField(ability, "nameKey")),
    assetId: stringField(entity, "assetId"),
    autoCollectSlots: numberString(findEffectValue(effects, "auto_collect_slots", 0)),
    capacityBonusPercent: numberString(multiplierToPercent(numberField(capacityEffect, "value", 1))),
    class: stringField(entity, "class") || "miner",
    description: localizationValue(content, stringField(entity, "descriptionKey")),
    hireCostAmount: numberString(numberField(firstHireCost, "amount", 0)),
    hireCostResourceId: stringField(firstHireCost, "resourceId") || findResourceId(content, "gold"),
    id: stringField(entity, "id"),
    loyalty: numberString(numberField(stats, "loyalty", 0)),
    luck: numberString(numberField(stats, "luck", 0)),
    productionBonusPercent: numberString(multiplierToPercent(numberField(productionEffect, "value", 1))),
    productionBonusResourceId: stringField(productionEffect, "resourceId"),
    rarity: stringField(entity, "rarity") || "common",
    sortOrder: numberString(numberField(entity, "sortOrder", 0)),
    specialization: stringField(entity, "specialization"),
    speed: numberString(numberField(stats, "speed", 0)),
    strength: numberString(numberField(stats, "strength", 0)),
    title: localizationValue(content, stringField(entity, "nameKey"))
  };
}

function createMineTemplateFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  return {
    completionRewardChestTypeId: stringField(entity, "completionRewardChestTypeId"),
    completionVeinTypeId: stringField(entity, "completionVeinTypeId"),
    depthMeters: numberString(numberField(entity, "depthMeters", 1)),
    difficulty: numberString(numberField(entity, "difficulty", 1)),
    height: numberString(numberField(entity, "height", 1)),
    id: stringField(entity, "id"),
    seedMode: stringField(entity, "seedMode") || "playerBased",
    sortOrder: numberString(numberField(entity, "sortOrder", 0)),
    title: localizationValue(content, stringField(entity, "displayNameKey")),
    width: numberString(numberField(entity, "width", 1))
  };
}

function createBuiltMineTypeFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const buildCost = arrayField(entity, "buildCost");
  const firstCost = recordAt(buildCost, 0);
  const secondCost = recordAt(buildCost, 1);

  return {
    assetId: stringField(entity, "assetId"),
    baseCapacity: numberString(numberField(entity, "baseCapacity", 1)),
    baseProductionPerHour: numberString(numberField(entity, "baseProductionPerHour", 1)),
    buildCostAmount1: numberString(numberField(firstCost, "amount", 0)),
    buildCostAmount2: numberString(numberField(secondCost, "amount", 0)),
    buildCostResourceId1: stringField(firstCost, "resourceId") || findResourceId(content, "stone"),
    buildCostResourceId2: stringField(secondCost, "resourceId"),
    buildTimeSec: numberString(numberField(entity, "buildTimeSec", 0)),
    id: stringField(entity, "id"),
    productionResourceId: stringField(entity, "productionResourceId") || findResourceId(content, "gold"),
    sourceVeinType: stringField(entity, "sourceVeinType") || stringField((content.veinTypes ?? [])[0] ?? {}, "id"),
    title: localizationValue(content, stringField(entity, "nameKey"))
  };
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

  if (kind === "goblins") {
    validateGoblinForm(state, content, errors);
  } else if (kind === "mineTemplates") {
    validateMineTemplateForm(state, content, errors);
  } else {
    validateBuiltMineTypeForm(state, content, errors);
  }

  return {
    errors,
    ok: errors.length === 0
  };
}

function validateGoblinForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  if (!formValue(state, "description").trim()) {
    errors.push("Описание RU обязательно.");
  }

  if (!goblinClassOptions.some((option) => option.value === formValue(state, "class"))) {
    errors.push("Выбери корректный класс гоблина.");
  }

  const specialization = formValue(state, "specialization");

  if (specialization && !goblinSpecializationOptions.some((option) => option.value === specialization)) {
    errors.push("Выбери корректную специализацию.");
  }

  if (!rarityOptions.some((option) => option.value === formValue(state, "rarity"))) {
    errors.push("Выбери корректную редкость.");
  }

  if (!formValue(state, "assetId").trim()) {
    errors.push("Asset ID обязателен.");
  }

  if (!formValue(state, "abilityTitle").trim() || !formValue(state, "abilityDescription").trim()) {
    errors.push("Название и описание умения обязательны.");
  }

  validateIntegerField(state, "sortOrder", "Sort order", errors);
  for (const field of ["strength", "speed", "luck", "loyalty"]) {
    validateIntegerField(state, field, statLabel(field), errors, { min: 0 });
  }
  validateIntegerField(state, "autoCollectSlots", "Слоты автосбора", errors, { min: 0 });
  validateNumberField(state, "capacityBonusPercent", "Бонус вместимости", errors, { min: 0 });
  validateNumberField(state, "productionBonusPercent", "Бонус добычи", errors, { min: 0 });
  validateIntegerField(state, "hireCostAmount", "Стоимость найма", errors, { min: 0 });

  if (toNumber(state.hireCostAmount) > 0 && !resourceIdSet(content).has(formValue(state, "hireCostResourceId"))) {
    errors.push("Выбери ресурс стоимости найма.");
  }

  const productionBonusResourceId = formValue(state, "productionBonusResourceId");

  if (productionBonusResourceId && !resourceIdSet(content).has(productionBonusResourceId)) {
    errors.push("Ресурс бонуса добычи не найден.");
  }
}

function validateMineTemplateForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  validateIntegerField(state, "sortOrder", "Sort order", errors);
  validateIntegerField(state, "width", "Ширина", errors, { min: 1 });
  validateIntegerField(state, "height", "Высота", errors, { min: 1 });
  validateIntegerField(state, "depthMeters", "Глубина", errors, { min: 1 });
  validateNumberField(state, "difficulty", "Сложность", errors, { min: 0.01 });

  if (!seedModeOptions.some((option) => option.value === formValue(state, "seedMode"))) {
    errors.push("Выбери корректный seed mode.");
  }

  const completionVeinTypeId = formValue(state, "completionVeinTypeId");
  const completionRewardChestTypeId = formValue(state, "completionRewardChestTypeId");

  if (completionVeinTypeId && !veinIdSet(content).has(completionVeinTypeId)) {
    errors.push("Жила после расчистки не найдена.");
  }

  if (completionRewardChestTypeId && !rewardChestIdSet(content).has(completionRewardChestTypeId)) {
    errors.push("Сундук перехода не найден.");
  }
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
  validateCostPair(state, "buildCostResourceId1", "buildCostAmount1", "Стоимость 1", content, errors, { optional: true });
  validateCostPair(state, "buildCostResourceId2", "buildCostAmount2", "Стоимость 2", content, errors, { optional: true });
}

function applyEntityForm(
  content: ContentBundle,
  kind: ContentEntityKind,
  selectedId: string,
  state: EntityFormState
): EntityDraftUpdate {
  if (kind === "goblins") {
    return applyGoblinForm(content, selectedId, state);
  }

  if (kind === "mineTemplates") {
    return applyMineTemplateForm(content, selectedId, state);
  }

  return applyBuiltMineTypeForm(content, selectedId, state);
}

function applyGoblinForm(content: ContentBundle, selectedId: string, state: EntityFormState): EntityDraftUpdate {
  const current = content.goblins.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Гоблин не найден.");
  }

  const ability = recordField(current, "ability");
  const id = formValue(state, "id");
  const specialization = formValue(state, "specialization");
  const nameKey = stringField(current, "nameKey") || `goblin.${id}.name`;
  const descriptionKey = stringField(current, "descriptionKey") || `goblin.${id}.description`;
  const abilityNameKey = stringField(ability, "nameKey") || `ability.${id}.name`;
  const abilityDescriptionKey = stringField(ability, "descriptionKey") || `ability.${id}.description`;
  const hireCostAmount = toInteger(state.hireCostAmount);
  const nextEffects = updateGoblinEffects(arrayField(ability, "effects"), state);
  const nextGoblin: ContentRecord = {
    ...current,
    ability: {
      ...ability,
      descriptionKey: abilityDescriptionKey,
      effects: nextEffects,
      id: stringField(ability, "id") || `${id}_ability`,
      nameKey: abilityNameKey
    },
    assetId: formValue(state, "assetId").trim(),
    baseStats: {
      loyalty: toInteger(state.loyalty),
      luck: toInteger(state.luck),
      speed: toInteger(state.speed),
      strength: toInteger(state.strength)
    },
    class: formValue(state, "class"),
    descriptionKey,
    hireCost: hireCostAmount > 0 ? [{ resourceId: formValue(state, "hireCostResourceId"), amount: hireCostAmount }] : [],
    id,
    nameKey,
    rarity: formValue(state, "rarity"),
    sortOrder: toInteger(state.sortOrder),
    specialization: specialization || undefined
  };

  if (!specialization) {
    Reflect.deleteProperty(nextGoblin, "specialization");
  }

  return {
    entity: nextGoblin,
    entityId: selectedId,
    entityType: "goblin",
    localization: {
      [abilityDescriptionKey]: formValue(state, "abilityDescription").trim(),
      [abilityNameKey]: formValue(state, "abilityTitle").trim(),
      [descriptionKey]: formValue(state, "description").trim(),
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Гоблин ${id} сохранен как draft.`
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
    ...current,
    depthMeters: toInteger(state.depthMeters),
    difficulty: toNumber(state.difficulty),
    displayNameKey,
    height: toInteger(state.height),
    id,
    seedMode: formValue(state, "seedMode"),
    sortOrder: toInteger(state.sortOrder),
    width: toInteger(state.width)
  };

  setOptionalField(nextMineTemplate, "completionVeinTypeId", formValue(state, "completionVeinTypeId"));
  setOptionalField(nextMineTemplate, "completionRewardChestTypeId", formValue(state, "completionRewardChestTypeId"));

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
    buildCost: createBuildCostFromForm(current, state),
    buildTimeSec: toInteger(state.buildTimeSec),
    id,
    nameKey,
    productionResourceId: formValue(state, "productionResourceId"),
    sourceVeinType: formValue(state, "sourceVeinType")
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

function updateGoblinEffects(effects: ContentRecord[], state: EntityFormState): ContentRecord[] {
  let nextEffects = effects.filter(
    (effect) => effect.type !== "auto_collect_slots" && effect.type !== "mine_capacity_multiplier" && effect.type !== "mine_production_multiplier"
  );
  const autoCollectSlots = toInteger(state.autoCollectSlots);
  const capacityMultiplier = percentToMultiplier(toNumber(state.capacityBonusPercent));
  const productionMultiplier = percentToMultiplier(toNumber(state.productionBonusPercent));

  if (autoCollectSlots > 0) {
    nextEffects = [...nextEffects, { type: "auto_collect_slots", value: autoCollectSlots }];
  }

  if (capacityMultiplier > 1) {
    nextEffects = [...nextEffects, { type: "mine_capacity_multiplier", value: capacityMultiplier }];
  }

  if (productionMultiplier > 1) {
    nextEffects = [
      ...nextEffects,
      {
        type: "mine_production_multiplier",
        ...(formValue(state, "productionBonusResourceId") ? { resourceId: formValue(state, "productionBonusResourceId") } : {}),
        value: productionMultiplier
      }
    ];
  }

  return nextEffects;
}

function createBuildCostFromForm(current: ContentRecord, state: EntityFormState): Array<{ amount: number; resourceId: string }> {
  const cost: Array<{ amount: number; resourceId: string }> = [];
  const amount1 = toInteger(state.buildCostAmount1);
  const amount2 = toInteger(state.buildCostAmount2);

  if (amount1 > 0) {
    cost.push({ resourceId: formValue(state, "buildCostResourceId1"), amount: amount1 });
  }

  if (amount2 > 0 && formValue(state, "buildCostResourceId2")) {
    cost.push({ resourceId: formValue(state, "buildCostResourceId2"), amount: amount2 });
  }

  return [...cost, ...arrayField(current, "buildCost").slice(2).filter(isResourceAmountLike).map((item) => ({
    amount: toInteger(String(item.amount)),
    resourceId: String(item.resourceId)
  }))];
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
  options: { min?: number } = {}
) {
  const value = toNumber(state[field]);

  if (!Number.isInteger(value)) {
    errors.push(`${label}: нужно целое число.`);
    return;
  }

  if (options.min !== undefined && value < options.min) {
    errors.push(`${label}: минимум ${options.min}.`);
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

function validateCostPair(
  state: EntityFormState,
  resourceField: string,
  amountField: string,
  label: string,
  content: ContentBundle,
  errors: string[],
  options: { optional?: boolean } = {}
) {
  const amount = toNumber(state[amountField]);
  const resourceId = formValue(state, resourceField);

  if (options.optional && !resourceId && amount === 0) {
    return;
  }

  validateIntegerField(state, amountField, label, errors, { min: options.optional ? 0 : 1 });

  if (amount > 0 && !resourceIdSet(content).has(resourceId)) {
    errors.push(`${label}: ресурс не найден.`);
  }
}

function resourceSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return content.resources.map((resource) => ({
    label: contentEntityTitle(resource, content.localization?.ru ?? {}),
    value: stringField(resource, "id")
  }));
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

function recordAt(items: ContentRecord[], index: number): ContentRecord {
  return items[index] ?? {};
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

function findEffect(effects: ContentRecord[], type: string): ContentRecord {
  return effects.find((effect) => effect.type === type) ?? {};
}

function findEffectValue(effects: ContentRecord[], type: string, fallback: number): number {
  return numberField(findEffect(effects, type), "value", fallback);
}

function multiplierToPercent(value: number): number {
  return Math.max(0, Math.round((value - 1) * 100));
}

function percentToMultiplier(percent: number): number {
  return Math.round((1 + Math.max(0, percent) / 100) * 1000) / 1000;
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

function isResourceAmountLike(value: ContentRecord): value is { amount: number; resourceId: string } {
  return typeof value.resourceId === "string" && typeof value.amount === "number";
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
