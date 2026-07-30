import { useEffect, useMemo, useState } from "react";

import type { ContentBundle, ContentVersion } from "../../api/adminApi";
import { parseContentPreview } from "./contentPreview";
import type { DraftContentToolResult } from "./draftTemplates";
import { getContentEntityItems, type ContentEntityKind, type EntityDraftUpdate } from "./entityRegistry";
import { stringField } from "./formState";

interface UseContentEntityToolsOptions {
  contentJson: string;
  onSaveContentEntity: (update: EntityDraftUpdate) => Promise<void>;
  selectedContentVersion: ContentVersion | null;
}

export function useContentEntityTools({
  contentJson,
  onSaveContentEntity,
  selectedContentVersion
}: UseContentEntityToolsOptions) {
  const [draftToolMessage, setDraftToolMessage] = useState<string | null>(null);
  const [entityEditorKind, setEntityEditorKind] = useState<ContentEntityKind>("goblins");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [showRawJson, setShowRawJson] = useState(false);
  const contentPreview = useMemo(() => parseContentPreview(contentJson), [contentJson]);
  const canEdit = selectedContentVersion?.status === "draft" || selectedContentVersion?.status === "validated";
  const selectedEntityItems = useMemo(
    () => (contentPreview ? getContentEntityItems(contentPreview, entityEditorKind) : []),
    [contentPreview, entityEditorKind]
  );

  useEffect(() => {
    if (selectedEntityItems.length === 0) {
      if (selectedEntityId) {
        setSelectedEntityId("");
      }
      return;
    }

    const firstEntity = selectedEntityItems[0];

    if (firstEntity && !selectedEntityItems.some((item) => stringField(item, "id") === selectedEntityId)) {
      setSelectedEntityId(stringField(firstEntity, "id"));
    }
  }, [selectedEntityId, selectedEntityItems]);

  useEffect(() => {
    setShowRawJson(false);
  }, [selectedContentVersion?.id]);

  async function applyDraftTool(builder: (content: ContentBundle) => DraftContentToolResult) {
    if (!canEdit || !selectedContentVersion) {
      return;
    }

    if (!contentPreview) {
      setDraftToolMessage("JSON сейчас не читается, сначала поправь синтаксис.");
      return;
    }

    try {
      const result = builder(contentPreview);
      if (!result.entityId) {
        throw new Error("Шаблон не вернул id сущности.");
      }
      await onSaveContentEntity({
        entity: result.entity,
        entityId: result.entityId,
        entityType: result.entityType,
        localization: result.localization,
        message: result.message
      });
      if (result.entityKind) {
        setEntityEditorKind(result.entityKind);
      }
      if (result.entityId) {
        setSelectedEntityId(result.entityId);
      }
      setDraftToolMessage(result.message);
    } catch (error) {
      setDraftToolMessage(error instanceof Error ? error.message : "Не удалось создать шаблон.");
    }
  }

  async function saveEntityEdit(update: EntityDraftUpdate) {
    setDraftToolMessage(null);

    try {
      await onSaveContentEntity(update);
      setDraftToolMessage(update.message);
    } catch (error) {
      setDraftToolMessage(error instanceof Error ? error.message : "Не удалось сохранить сущность.");
    }
  }

  function toggleRawJson() {
    setShowRawJson((current) => !current);
  }

  return {
    applyDraftTool,
    canEdit,
    contentPreview,
    draftToolMessage,
    entityEditorKind,
    saveEntityEdit,
    selectedEntityId,
    setEntityEditorKind,
    setSelectedEntityId,
    showRawJson,
    toggleRawJson
  };
}
