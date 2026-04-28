import { createHash, randomBytes } from "node:crypto";
import { isBootstrapEmail, normalizeEmail } from "../security/bootstrap.js";
import { hashPassword, verifyPassword } from "../security/passwords.js";

const defaultSessionTtlMs = 1000 * 60 * 60 * 24 * 7;

export interface AdminAuthUser {
  id: string;
  email: string;
  passwordHash: string | null;
  role: string;
  mustSetPassword: boolean;
}

export interface AdminAuthSession {
  adminUserId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface AuditLogInput {
  actorAdminUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata?: Record<string, unknown>;
}

export interface AdminAuthStore {
  findUserByEmail(email: string): Promise<AdminAuthUser | null>;
  findUserById(id: string): Promise<AdminAuthUser | null>;
  createBootstrapUser(email: string): Promise<AdminAuthUser>;
  updateUserPassword(userId: string, passwordHash: string): Promise<AdminAuthUser>;
  createSession(input: { adminUserId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findActiveSessionByTokenHash(tokenHash: string, now: Date): Promise<AdminAuthSession | null>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
  writeAuditLog(input: AuditLogInput): Promise<void>;
}

export interface PublicAdminUser {
  id: string;
  email: string;
  role: string;
  mustSetPassword: boolean;
}

export interface AuthSuccess {
  token: string;
  user: PublicAdminUser;
}

export type AuthErrorCode =
  | "bootstrap_email_not_allowed"
  | "password_required"
  | "invalid_credentials"
  | "invalid_session";

export type AuthResult = { ok: true; value: AuthSuccess } | { ok: false; code: AuthErrorCode };
export type UserResult = { ok: true; user: PublicAdminUser } | { ok: false; code: "invalid_session" };

export interface AdminAuthService {
  bootstrapLogin(email: string): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  getSessionUser(token: string): Promise<UserResult>;
  setPassword(token: string, password: string): Promise<UserResult>;
  logout(token: string): Promise<void>;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createAdminAuthService(options: {
  store: AdminAuthStore;
  bootstrapAdminEmails: readonly string[];
  sessionTtlMs?: number;
  now?: () => Date;
}): AdminAuthService {
  const sessionTtlMs = options.sessionTtlMs ?? defaultSessionTtlMs;
  const now = options.now ?? (() => new Date());

  async function issueSession(user: AdminAuthUser): Promise<AuthSuccess> {
    const token = randomBytes(32).toString("base64url");
    const createdAt = now();
    const expiresAt = new Date(createdAt.getTime() + sessionTtlMs);

    await options.store.createSession({
      adminUserId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt
    });

    return {
      token,
      user: toPublicUser(user)
    };
  }

  async function findUserForToken(token: string): Promise<AdminAuthUser | null> {
    const tokenHash = hashSessionToken(token);
    const session = await options.store.findActiveSessionByTokenHash(tokenHash, now());

    if (!session) {
      return null;
    }

    return options.store.findUserById(session.adminUserId);
  }

  return {
    async bootstrapLogin(email) {
      const normalizedEmail = normalizeEmail(email);

      if (!isBootstrapEmail(normalizedEmail, options.bootstrapAdminEmails)) {
        await options.store.writeAuditLog({
          actorAdminUserId: null,
          action: "admin.bootstrap.denied",
          targetType: "admin_user",
          targetId: normalizedEmail,
          metadata: { reason: "email_not_allowed" }
        });
        return { ok: false, code: "bootstrap_email_not_allowed" };
      }

      let user = await options.store.findUserByEmail(normalizedEmail);

      if (user && !user.mustSetPassword) {
        await options.store.writeAuditLog({
          actorAdminUserId: user.id,
          action: "admin.bootstrap.denied",
          targetType: "admin_user",
          targetId: user.id,
          metadata: { reason: "password_already_set" }
        });
        return { ok: false, code: "password_required" };
      }

      user ??= await options.store.createBootstrapUser(normalizedEmail);

      await options.store.writeAuditLog({
        actorAdminUserId: user.id,
        action: "admin.bootstrap.login",
        targetType: "admin_user",
        targetId: user.id
      });

      return { ok: true, value: await issueSession(user) };
    },

    async login(email, password) {
      const normalizedEmail = normalizeEmail(email);
      const user = await options.store.findUserByEmail(normalizedEmail);

      if (!user?.passwordHash) {
        return { ok: false, code: "invalid_credentials" };
      }

      const passwordMatches = await verifyPassword(password, user.passwordHash);

      if (!passwordMatches) {
        await options.store.writeAuditLog({
          actorAdminUserId: user.id,
          action: "admin.login.denied",
          targetType: "admin_user",
          targetId: user.id,
          metadata: { reason: "invalid_password" }
        });
        return { ok: false, code: "invalid_credentials" };
      }

      await options.store.writeAuditLog({
        actorAdminUserId: user.id,
        action: "admin.login",
        targetType: "admin_user",
        targetId: user.id
      });

      return { ok: true, value: await issueSession(user) };
    },

    async getSessionUser(token) {
      const user = await findUserForToken(token);

      if (!user) {
        return { ok: false, code: "invalid_session" };
      }

      return { ok: true, user: toPublicUser(user) };
    },

    async setPassword(token, password) {
      const user = await findUserForToken(token);

      if (!user) {
        return { ok: false, code: "invalid_session" };
      }

      const passwordHash = await hashPassword(password);
      const updatedUser = await options.store.updateUserPassword(user.id, passwordHash);

      await options.store.writeAuditLog({
        actorAdminUserId: updatedUser.id,
        action: "admin.password.set",
        targetType: "admin_user",
        targetId: updatedUser.id
      });

      return { ok: true, user: toPublicUser(updatedUser) };
    },

    async logout(token) {
      await options.store.revokeSession(hashSessionToken(token), now());
    }
  };
}

function toPublicUser(user: AdminAuthUser): PublicAdminUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    mustSetPassword: user.mustSetPassword
  };
}
