import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AdminAuthService } from "./auth.js";
import { requireReadyAdminUser } from "./http-auth.js";

const allowedMimeTypes = ["image/png", "image/webp", "image/jpeg"] as const;
const allowedExtensions = [".png", ".webp", ".jpg", ".jpeg"] as const;
const maxAssetBytes = 5 * 1024 * 1024;

const assetIdSchema = z.string().min(1).max(96).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u);

const uploadPayloadSchema = z.object({
  assetId: assetIdSchema,
  dataBase64: z.string().min(1),
  fileName: z.string().min(1).max(180).optional(),
  mimeType: z.enum(allowedMimeTypes)
});

export interface AssetRoutesOptions {
  assetStorageDir: string;
}

export async function registerAssetRoutes(
  server: FastifyInstance,
  authService: AdminAuthService,
  options: AssetRoutesOptions
): Promise<void> {
  const storageDir = path.resolve(options.assetStorageDir);

  server.get("/assets/:assetId", async (request, reply) => {
    const params = z.object({ assetId: assetIdSchema }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "invalid_asset_id" });
    }

    const asset = await findStoredAsset(storageDir, params.data.assetId);

    if (!asset) {
      return reply.status(404).send({ error: "asset_not_found" });
    }

    return reply
      .header("Cache-Control", "public, max-age=60")
      .header("Content-Type", asset.mimeType)
      .send(createReadStream(asset.filePath));
  });

  server.post("/admin/assets/goblin-renders", async (request, reply) => {
    const user = await requireReadyAdminUser(request, reply, authService);

    if (!user) {
      return undefined;
    }

    const payload = uploadPayloadSchema.safeParse(request.body);

    if (!payload.success) {
      return reply.status(400).send({ error: "invalid_asset_payload" });
    }

    const buffer = decodeBase64Payload(payload.data.dataBase64);

    if (!buffer || buffer.length === 0 || buffer.length > maxAssetBytes) {
      return reply.status(400).send({ error: "invalid_asset_file" });
    }

    const extension = extensionForMimeType(payload.data.mimeType);
    const fileName = `${payload.data.assetId}${extension}`;
    const filePath = path.join(storageDir, fileName);

    await mkdir(storageDir, { recursive: true });
    await removeExistingAssetFiles(storageDir, payload.data.assetId, extension);
    await writeFile(filePath, buffer);

    return {
      asset: {
        assetId: payload.data.assetId,
        fileName,
        mimeType: payload.data.mimeType,
        size: buffer.length,
        updatedAt: new Date().toISOString(),
        url: `/api/assets/${encodeURIComponent(payload.data.assetId)}`
      }
    };
  });
}

function decodeBase64Payload(value: string): Buffer | null {
  const base64 = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;

  try {
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

function extensionForMimeType(mimeType: (typeof allowedMimeTypes)[number]): ".jpg" | ".png" | ".webp" {
  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  return ".png";
}

function mimeTypeForExtension(extension: string): string {
  if (extension === ".webp") {
    return "image/webp";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  return "image/png";
}

async function findStoredAsset(storageDir: string, assetId: string): Promise<{ filePath: string; mimeType: string } | null> {
  for (const extension of allowedExtensions) {
    const filePath = path.join(storageDir, `${assetId}${extension}`);

    if (await fileExists(filePath)) {
      return {
        filePath,
        mimeType: mimeTypeForExtension(extension)
      };
    }
  }

  return null;
}

async function removeExistingAssetFiles(storageDir: string, assetId: string, keepExtension: string): Promise<void> {
  await Promise.all(
    allowedExtensions
      .filter((extension) => extension !== keepExtension)
      .map((extension) => rm(path.join(storageDir, `${assetId}${extension}`), { force: true }))
  );
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}
