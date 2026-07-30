import { type FormEvent, useEffect, useState } from "react";

import { apiRequest, ApiRequestError, type ContentBundle, type ContentVersion } from "../../api/adminApi";
import type { EntityDraftUpdate } from "./entityRegistry";

interface UseAdminContentOptions {
  contentVersionSlug: string | null;
  enabled: boolean;
  onMissingSession: () => void;
  onOpenVersion: (version: ContentVersion) => void;
  sessionToken: string | null;
}

export function useAdminContent({
  contentVersionSlug,
  enabled,
  onMissingSession,
  onOpenVersion,
  sessionToken
}: UseAdminContentOptions) {
  const [contentVersions, setContentVersions] = useState<ContentVersion[]>([]);
  const [selectedContentVersion, setSelectedContentVersion] = useState<ContentVersion | null>(null);
  const [contentVersionName, setContentVersionName] = useState("");
  const [contentNotes, setContentNotes] = useState("");
  const [contentJson, setContentJson] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const [contentMessage, setContentMessage] = useState<string | null>(null);
  const [contentErrors, setContentErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !sessionToken) {
      return;
    }

    void loadContentVersions();
  }, [contentVersionSlug, enabled, sessionToken]);

  useEffect(() => {
    if (!enabled || contentVersionSlug) {
      return;
    }

    setContentJson("");
    setContentErrors([]);
    setSelectedContentVersion(null);
  }, [contentVersionSlug, enabled]);

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

      if (contentVersionSlug) {
        const versionFromRoute = response.versions.find(
          (version) => version.version === contentVersionSlug || version.id === contentVersionSlug
        );

        if (versionFromRoute) {
          if (selectedContentVersion?.id !== versionFromRoute.id || !contentJson) {
            await loadContentVersion(versionFromRoute.id);
          }
        } else {
          setContentJson("");
          setContentErrors([]);
          setSelectedContentVersion(null);
          setContentMessage(`Версия ${contentVersionSlug} не найдена.`);
        }
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
      onMissingSession();
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
      setContentMessage("Draft-версия создана на основе последней сохраненной версии контента.");
      onOpenVersion(response.version);
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "Не удалось создать версию.");
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
      setContentMessage(
        response.validation.ok ? "Версия опубликована." : "Публикация остановлена из-за ошибок."
      );
    } catch (error) {
      setContentMessage(error instanceof Error ? error.message : "Не удалось опубликовать контент.");
    } finally {
      setBusy(false);
    }
  }

  function handleSelectContentVersion(id: string) {
    const version = contentVersions.find((item) => item.id === id);

    if (version) {
      onOpenVersion(version);
      return;
    }

    void loadContentVersion(id);
  }

  return {
    busy,
    contentErrors,
    contentJson,
    contentLoading,
    contentMessage,
    contentNotes,
    contentVersionName,
    contentVersions,
    handleCreateContentVersion,
    handlePublishContent,
    handleSaveContentEntity,
    handleSelectContentVersion,
    handleValidateContent,
    selectedContentVersion,
    setContentNotes,
    setContentVersionName
  };
}

function replaceContentVersion(versions: ContentVersion[], nextVersion: ContentVersion): ContentVersion[] {
  return versions
    .map((version) => (version.id === nextVersion.id ? nextVersion : version))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}
