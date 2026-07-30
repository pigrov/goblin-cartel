import { PlusCircle } from "lucide-react";

import type { ContentBundle } from "../../api/adminApi";
import {
  addDraftBlockTypeTemplate,
  addDraftBossCardTemplate,
  addDraftBuiltMineTypeTemplate,
  addDraftMineTemplate,
  addDraftRewardChestTypeTemplate,
  type DraftContentToolResult
} from "./draftTemplates";

export function ContentTemplateActions(props: {
  canEdit: boolean;
  hasSelectedVersion: boolean;
  onApplyDraftTool: (builder: (content: ContentBundle) => DraftContentToolResult) => void;
  onToggleRawJson: () => void;
  showRawJson: boolean;
}) {
  const disabled = !props.canEdit || !props.hasSelectedVersion;

  return (
    <div className="content-template-actions">
      <button disabled={disabled} onClick={() => props.onApplyDraftTool(addDraftBlockTypeTemplate)} type="button">
        <PlusCircle size={16} />
        Блок
      </button>
      <button disabled={disabled} onClick={() => props.onApplyDraftTool(addDraftMineTemplate)} type="button">
        <PlusCircle size={16} />
        Рудник
      </button>
      <button disabled={disabled} onClick={() => props.onApplyDraftTool(addDraftBuiltMineTypeTemplate)} type="button">
        <PlusCircle size={16} />
        Тип шахты
      </button>
      <button disabled={disabled} onClick={() => props.onApplyDraftTool(addDraftRewardChestTypeTemplate)} type="button">
        <PlusCircle size={16} />
        Сундук
      </button>
      <button disabled={disabled} onClick={() => props.onApplyDraftTool(addDraftBossCardTemplate)} type="button">
        <PlusCircle size={16} />
        Карта
      </button>
      <button
        className={props.showRawJson ? "active" : ""}
        disabled={!props.hasSelectedVersion}
        onClick={props.onToggleRawJson}
        type="button"
      >
        JSON
      </button>
    </div>
  );
}
