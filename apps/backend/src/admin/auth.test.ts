import { describe, expect, it } from "vitest";
import {
  createAdminAuthService,
  hashSessionToken,
  type AdminAuthSession,
  type AdminAuthStore,
  type AdminAuthUser,
  type AuditLogInput
} from "./auth.js";

class MemoryAdminAuthStore implements AdminAuthStore {
  readonly users = new Map<string, AdminAuthUser>();
  readonly sessions = new Map<string, AdminAuthSession>();
  readonly auditLogs: AuditLogInput[] = [];

  async findUserByEmail(email: string): Promise<AdminAuthUser | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findUserById(id: string): Promise<AdminAuthUser | null> {
    return this.users.get(id) ?? null;
  }

  async createBootstrapUser(email: string): Promise<AdminAuthUser> {
    const user: AdminAuthUser = {
      id: `admin-${this.users.size + 1}`,
      email,
      passwordHash: null,
      role: "owner",
      mustSetPassword: true
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<AdminAuthUser> {
    const user = this.users.get(userId);

    if (!user) {
      throw new Error("Missing user");
    }

    const updatedUser = {
      ...user,
      passwordHash,
      mustSetPassword: false
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async createSession(input: { adminUserId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    this.sessions.set(input.tokenHash, {
      adminUserId: input.adminUserId,
      expiresAt: input.expiresAt,
      revokedAt: null
    });
  }

  async findActiveSessionByTokenHash(tokenHash: string, now: Date): Promise<AdminAuthSession | null> {
    const session = this.sessions.get(tokenHash);

    if (!session || session.revokedAt || session.expiresAt <= now) {
      return null;
    }

    return session;
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    const session = this.sessions.get(tokenHash);

    if (session) {
      this.sessions.set(tokenHash, {
        ...session,
        revokedAt: now
      });
    }
  }

  async writeAuditLog(input: AuditLogInput): Promise<void> {
    this.auditLogs.push(input);
  }
}

describe("admin auth", () => {
  it("allows configured bootstrap email to enter without password once", async () => {
    const store = new MemoryAdminAuthStore();
    const auth = createAdminAuthService({
      store,
      bootstrapAdminEmails: ["owner@example.com"]
    });

    const result = await auth.bootstrapLogin("Owner@Example.com");

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.user).toMatchObject({
      email: "owner@example.com",
      role: "owner",
      mustSetPassword: true
    });
    expect(store.sessions.has(hashSessionToken(result.value.token))).toBe(true);
    expect(store.auditLogs.map((log) => log.action)).toContain("admin.bootstrap.login");
  });

  it("rejects bootstrap email outside the allowlist", async () => {
    const store = new MemoryAdminAuthStore();
    const auth = createAdminAuthService({
      store,
      bootstrapAdminEmails: ["owner@example.com"]
    });

    const result = await auth.bootstrapLogin("intruder@example.com");

    expect(result).toEqual({ ok: false, code: "bootstrap_email_not_allowed" });
    expect(store.users.size).toBe(0);
    expect(store.auditLogs.map((log) => log.action)).toContain("admin.bootstrap.denied");
  });

  it("requires password login after password is set", async () => {
    const store = new MemoryAdminAuthStore();
    const auth = createAdminAuthService({
      store,
      bootstrapAdminEmails: ["owner@example.com"]
    });

    const bootstrap = await auth.bootstrapLogin("owner@example.com");
    expect(bootstrap.ok).toBe(true);

    if (!bootstrap.ok) {
      return;
    }

    const passwordResult = await auth.setPassword(bootstrap.value.token, "strong-password-1");
    expect(passwordResult).toEqual({
      ok: true,
      user: {
        id: bootstrap.value.user.id,
        email: "owner@example.com",
        role: "owner",
        mustSetPassword: false
      }
    });

    const secondBootstrap = await auth.bootstrapLogin("owner@example.com");
    expect(secondBootstrap).toEqual({ ok: false, code: "password_required" });

    const failedLogin = await auth.login("owner@example.com", "wrong-password");
    expect(failedLogin).toEqual({ ok: false, code: "invalid_credentials" });

    const login = await auth.login("owner@example.com", "strong-password-1");
    expect(login.ok).toBe(true);
  });

  it("revokes session on logout", async () => {
    const store = new MemoryAdminAuthStore();
    const auth = createAdminAuthService({
      store,
      bootstrapAdminEmails: ["owner@example.com"]
    });

    const bootstrap = await auth.bootstrapLogin("owner@example.com");
    expect(bootstrap.ok).toBe(true);

    if (!bootstrap.ok) {
      return;
    }

    expect(await auth.getSessionUser(bootstrap.value.token)).toMatchObject({ ok: true });

    await auth.logout(bootstrap.value.token);

    expect(await auth.getSessionUser(bootstrap.value.token)).toEqual({ ok: false, code: "invalid_session" });
  });
});
