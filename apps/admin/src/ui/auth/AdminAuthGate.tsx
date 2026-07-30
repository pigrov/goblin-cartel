import { KeyRound, Loader2, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import type { FormEvent } from "react";
import type { AdminUser } from "../../api/adminApi";

export type AdminAuthMode = "bootstrap" | "password";

export function AdminAuthGate(props: {
  authMode: AdminAuthMode;
  busy: boolean;
  email: string;
  loadingSession: boolean;
  message: string | null;
  newPassword: string;
  onAuthModeChange: (value: AdminAuthMode) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEmailChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void;
  password: string;
  user: AdminUser | null;
}) {
  if (props.loadingSession) {
    return (
      <main className="auth-page">
        <section className="gc-panel auth-panel auth-panel-compact">
          <Loader2 className="spin" size={24} />
          <p>Проверяем доступ</p>
        </section>
      </main>
    );
  }

  if (!props.user) {
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
              aria-selected={props.authMode === "bootstrap"}
              className={props.authMode === "bootstrap" ? "active" : ""}
              onClick={() => props.onAuthModeChange("bootstrap")}
              role="tab"
              type="button"
            >
              <UserPlus size={18} />
              Первый вход
            </button>
            <button
              aria-selected={props.authMode === "password"}
              className={props.authMode === "password" ? "active" : ""}
              onClick={() => props.onAuthModeChange("password")}
              role="tab"
              type="button"
            >
              <KeyRound size={18} />
              Пароль
            </button>
          </div>

          <form className="auth-form" onSubmit={props.onAuthSubmit}>
            <label>
              Email
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => props.onEmailChange(event.target.value)}
                required
                type="email"
                value={props.email}
              />
            </label>

            {props.authMode === "password" ? (
              <label>
                Пароль
                <input
                  autoComplete="current-password"
                  onChange={(event) => props.onPasswordChange(event.target.value)}
                  required
                  type="password"
                  value={props.password}
                />
              </label>
            ) : null}

            {props.message ? <p className="form-message">{props.message}</p> : null}

            <button className="primary-action" disabled={props.busy} type="submit">
              {props.busy ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={18} />}
              Войти
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="gc-panel auth-panel">
        <div className="auth-brand">
          <LockKeyhole size={30} />
          <div>
            <p>{props.user.email}</p>
            <h1>Установи пароль</h1>
          </div>
        </div>

        <form className="auth-form" onSubmit={props.onPasswordSubmit}>
          <label>
            Новый пароль
            <input
              autoComplete="new-password"
              minLength={10}
              onChange={(event) => props.onNewPasswordChange(event.target.value)}
              required
              type="password"
              value={props.newPassword}
            />
          </label>

          {props.message ? <p className="form-message">{props.message}</p> : null}

          <button className="primary-action" disabled={props.busy} type="submit">
            {props.busy ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
            Сохранить пароль
          </button>
        </form>
      </section>
    </main>
  );
}
