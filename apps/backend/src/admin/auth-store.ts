import { and, eq, gt, isNull } from "drizzle-orm";
import type { createDb } from "../db/client.js";
import { adminSessions, adminUsers, auditLogs } from "../db/schema.js";
import type { AdminAuthStore, AdminAuthUser, AuditLogInput } from "./auth.js";

type AppDb = ReturnType<typeof createDb>;

export class DrizzleAdminAuthStore implements AdminAuthStore {
  constructor(private readonly db: AppDb) {}

  async findUserByEmail(email: string): Promise<AdminAuthUser | null> {
    const [user] = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    return user ?? null;
  }

  async findUserById(id: string): Promise<AdminAuthUser | null> {
    const [user] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    return user ?? null;
  }

  async createBootstrapUser(email: string): Promise<AdminAuthUser> {
    const [user] = await this.db
      .insert(adminUsers)
      .values({
        email,
        role: "owner",
        mustSetPassword: true
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create bootstrap admin user");
    }

    return user;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<AdminAuthUser> {
    const [user] = await this.db
      .update(adminUsers)
      .set({
        passwordHash,
        mustSetPassword: false,
        updatedAt: new Date()
      })
      .where(eq(adminUsers.id, userId))
      .returning();

    if (!user) {
      throw new Error("Failed to update admin user password");
    }

    return user;
  }

  async createSession(input: { adminUserId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.db.insert(adminSessions).values(input);
  }

  async findActiveSessionByTokenHash(tokenHash: string, now: Date) {
    const [session] = await this.db
      .select()
      .from(adminSessions)
      .where(and(eq(adminSessions.tokenHash, tokenHash), isNull(adminSessions.revokedAt), gt(adminSessions.expiresAt, now)))
      .limit(1);

    return session ?? null;
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.db
      .update(adminSessions)
      .set({
        revokedAt: now
      })
      .where(eq(adminSessions.tokenHash, tokenHash));
  }

  async writeAuditLog(input: AuditLogInput): Promise<void> {
    await this.db.insert(auditLogs).values({
      actorAdminUserId: input.actorAdminUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata
    });
  }
}
