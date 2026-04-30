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
  onSelectContentVersion: (id: string) => void;
  onValidateContent: () => void;
  selectedContentVersion: ContentVersion | null;
}) {
  const [draftToolMessage, setDraftToolMessage] = useState<string | null>(null);
  const contentPreview = useMemo(() => parseContentPreview(props.contentJson), [props.contentJson]);
  const canEdit =
    props.selectedContentVersion?.status === "draft" || props.selectedContentVersion?.status === "validated";

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
              <span>{contentPreview ? "Быстрые шаблоны попадут в текущий JSON draft" : "JSON пока не разобран"}</span>
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
