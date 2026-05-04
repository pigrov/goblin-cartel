import { starterContentBundle, type ContentBundle } from "@goblin-cartel/content-schemas";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnv } from "../config/env.js";
import { contentEntities, contentVersions } from "../db/schema.js";
import * as schema from "../db/schema.js";

type ContentEntityInsert = typeof contentEntities.$inferInsert;

const version = process.argv[2] ?? "0.1.0";
const env = loadEnv();
const client = postgres(env.databaseUrl, { max: 1 });
const db = drizzle(client, { schema });

try {
  const result = await db.transaction(async (tx) => {
    await tx.delete(contentEntities);
    await tx.delete(contentVersions);

    const now = new Date();
    const [contentVersion] = await tx
      .insert(contentVersions)
      .values({
        version,
        status: "published",
        notes: "Development baseline reset",
        createdBy: null,
        createdAt: now,
        updatedAt: now,
        publishedAt: now
      })
      .returning();

    if (!contentVersion) {
      throw new Error("Failed to create content version");
    }

    const rows = contentRows(contentVersion.id, starterContentBundle);

    if (rows.length > 0) {
      await tx.insert(contentEntities).values(rows);
    }

    return {
      entityCount: rows.length,
      id: contentVersion.id,
      version: contentVersion.version
    };
  });

  console.log(JSON.stringify(result));
} finally {
  await client.end();
}

function contentRows(contentVersionId: string, content: ContentBundle): ContentEntityInsert[] {
  return [
    ...content.resources.map((resource) => ({
      contentVersionId,
      entityType: "resource",
      entityId: resource.id,
      data: resource
    })),
    ...content.blockTypes.map((blockType) => ({
      contentVersionId,
      entityType: "blockType",
      entityId: blockType.id,
      data: blockType
    })),
    ...content.veinTypes.map((veinType) => ({
      contentVersionId,
      entityType: "veinType",
      entityId: veinType.id,
      data: veinType
    })),
    ...content.builtMineTypes.map((builtMineType) => ({
      contentVersionId,
      entityType: "builtMineType",
      entityId: builtMineType.id,
      data: builtMineType
    })),
    ...content.rewardChestTypes.map((rewardChestType) => ({
      contentVersionId,
      entityType: "rewardChestType",
      entityId: rewardChestType.id,
      data: rewardChestType
    })),
    ...content.bossCards.map((bossCard) => ({
      contentVersionId,
      entityType: "bossCard",
      entityId: bossCard.id,
      data: bossCard
    })),
    ...content.mineTemplates.map((mineTemplate) => ({
      contentVersionId,
      entityType: "mineTemplate",
      entityId: mineTemplate.id,
      data: mineTemplate
    })),
    ...content.goblins.map((goblin) => ({
      contentVersionId,
      entityType: "goblin",
      entityId: goblin.id,
      data: goblin
    })),
    {
      contentVersionId,
      entityType: "goblinGeneration",
      entityId: "default",
      data: content.goblinGeneration
    },
    {
      contentVersionId,
      entityType: "goblinHut",
      entityId: "default",
      data: content.goblinHut
    },
    {
      contentVersionId,
      entityType: "elevator",
      entityId: "default",
      data: content.elevator
    },
    ...Object.entries(content.localization).map(([locale, messages]) => ({
      contentVersionId,
      entityType: "localization",
      entityId: locale,
      data: messages
    }))
  ];
}
