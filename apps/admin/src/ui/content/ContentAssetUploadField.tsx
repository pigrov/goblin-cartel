import { type ChangeEvent, useState } from "react";
import { apiRequest, type AssetUploadResponse } from "../../api/adminApi";

export function ContentAssetUploadField(props: {
  assetId?: string;
  label: string;
  onAssetIdChange: (assetId: string) => void;
  token: string | null;
  uploadLabel?: string;
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
      const response = await apiRequest<AssetUploadResponse>("/admin/assets", {
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
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить ассет.");
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
          <span>{busy ? "Загружаем..." : props.uploadLabel ?? "Загрузить ассет"}</span>
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
