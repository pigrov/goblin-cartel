import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { PlayerSaveService } from "./player-save.js";

const bootstrapPayloadSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional()
  })
  .optional();

const savePayloadSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: z.string().min(1).max(80),
  expectedRevision: z.number().int().min(0).optional(),
  state: z.record(z.string(), z.unknown())
});

const scoresPayloadSchema = z.object({
  scores: z
    .array(
      z.object({
        key: z.string().min(1).max(80),
        seasonId: z.string().min(1).max(80).optional(),
        value: z.number().int().min(0)
      })
    )
    .max(20)
});

const leaderboardParamsSchema = z.object({
  scoreKey: z.string().trim().min(1).max(80)
});

const leaderboardQuerySchema = z.object({
  seasonId: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

const vkIdentityPayloadSchema = z
  .object({
    accessToken: z.string().trim().min(1).max(4096).optional(),
    authorizationCode: z.string().trim().min(1).max(4096).optional(),
    codeVerifier: z.string().trim().min(1).max(512).optional(),
    idToken: z.string().trim().min(1).max(4096).optional(),
    redirectUri: z.string().trim().min(1).max(500).optional()
  })
  .refine((payload) => payload.accessToken || payload.authorizationCode || payload.idToken);

export async function registerPlayerSaveRoutes(server: FastifyInstance, playerSaveService: PlayerSaveService): Promise<void> {
  server.post("/player/bootstrap", async (request, reply) => {
    const payload = bootstrapPayloadSchema.safeParse(request.body);

    if (!payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await playerSaveService.bootstrap({
      token: getBearerToken(request) ?? undefined,
      displayName: payload.data?.displayName ?? null
    });

    if (!result.ok) {
      return reply.status(401).send({ error: result.code });
    }

    return result.value;
  });

  server.get("/player/save", async (request, reply) => {
    const result = await playerSaveService.getSave(getBearerToken(request));

    if (!result.ok) {
      return reply.status(401).send({ error: result.code });
    }

    return { save: result.save };
  });

  server.put("/player/save", async (request, reply) => {
    const payload = savePayloadSchema.safeParse(request.body);

    if (!payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await playerSaveService.writeSave(getBearerToken(request), payload.data);

    if (!result.ok) {
      return reply.status(result.code === "revision_conflict" ? 409 : 401).send({
        error: result.code,
        ...(result.current ? { current: result.current } : {})
      });
    }

    return { save: result.save };
  });

  server.put("/player/scores", async (request, reply) => {
    const payload = scoresPayloadSchema.safeParse(request.body);

    if (!payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await playerSaveService.upsertScores(getBearerToken(request), payload.data);

    if (!result.ok) {
      return reply.status(401).send({ error: result.code });
    }

    return { scores: result.scores };
  });

  server.post("/player/link/vk-id", async (request, reply) => {
    const payload = vkIdentityPayloadSchema.safeParse(request.body);

    if (!payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await playerSaveService.linkVkIdentity(getBearerToken(request), payload.data);

    if (!result.ok) {
      const status = result.code === "invalid_player_session" ? 401 : result.code === "identity_verifier_not_configured" ? 503 : 400;
      return reply.status(status).send({ error: result.code });
    }

    return result;
  });

  server.get("/player/leaderboard/:scoreKey", async (request, reply) => {
    const params = leaderboardParamsSchema.safeParse(request.params);
    const query = leaderboardQuerySchema.safeParse(request.query);

    if (!params.success || !query.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    return playerSaveService.listLeaderboard({
      scoreKey: params.data.scoreKey,
      seasonId: query.data.seasonId,
      limit: query.data.limit
    });
  });
}

function getBearerToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}
