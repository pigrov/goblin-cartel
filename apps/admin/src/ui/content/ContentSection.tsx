import { AlertTriangle } from "lucide-react";
import { type FormEvent } from "react";
import type { ContentVersion } from "../../api/adminApi";
import { ContentEditorToolbar } from "./ContentEditorToolbar";
import { ContentEntityToolsPanel } from "./ContentEntityToolsPanel";
import { ContentVersionHome } from "./ContentVersionHome";
import { type EntityDraftUpdate } from "./entityRegistry";
import { useContentEntityTools } from "./useContentEntityTools";

export function ContentSection(props: {
  busy: boolean;
  contentErrors: string[];
  contentJson: string;
  contentLoading: boolean;
  contentMessage: string | null;
  contentNotes: string;
  contentVersionName: string;
  contentVersions: ContentVersion[];
  onContentNotesChange: (value: string) => void;
  onContentVersionNameChange: (value: string) => void;
  onCreateContentVersion: (event: FormEvent<HTMLFormElement>) => void;
  onOpenContentList: () => void;
  onPublishContent: () => void;
  onSaveContentEntity: (update: EntityDraftUpdate) => Promise<void>;
  onSelectContentVersion: (id: string) => void;
  onValidateContent: () => void;
  selectedContentVersion: ContentVersion | null;
  sessionToken: string | null;
}) {
  const entityTools = useContentEntityTools({
    contentJson: props.contentJson,
    onSaveContentEntity: props.onSaveContentEntity,
    selectedContentVersion: props.selectedContentVersion
  });

  if (!props.selectedContentVersion) {
    return (
      <ContentVersionHome
        busy={props.busy}
        contentLoading={props.contentLoading}
        contentMessage={props.contentMessage}
        contentNotes={props.contentNotes}
        contentVersionName={props.contentVersionName}
        contentVersions={props.contentVersions}
        onContentNotesChange={props.onContentNotesChange}
        onContentVersionNameChange={props.onContentVersionNameChange}
        onCreateContentVersion={props.onCreateContentVersion}
        onSelectContentVersion={props.onSelectContentVersion}
      />
    );
  }

  return (
    <section className="content-editor content-editor-full">
      <ContentEditorToolbar
        busy={props.busy}
        canEdit={entityTools.canEdit}
        onOpenContentList={props.onOpenContentList}
        onPublishContent={props.onPublishContent}
        onValidateContent={props.onValidateContent}
        selectedContentVersion={props.selectedContentVersion}
      />

      {props.selectedContentVersion && !entityTools.canEdit ? (
        <p className="content-tool-message">Эта версия доступна только для просмотра. Создай новый draft, чтобы менять контент.</p>
      ) : null}

      <ContentEntityToolsPanel
        busy={props.busy}
        canEdit={entityTools.canEdit}
        content={entityTools.contentPreview}
        draftToolMessage={entityTools.draftToolMessage}
        hasSelectedVersion={Boolean(props.selectedContentVersion)}
        kind={entityTools.entityEditorKind}
        onApplyDraftTool={(builder) => void entityTools.applyDraftTool(builder)}
        onKindChange={entityTools.setEntityEditorKind}
        onSaveEntityEdit={entityTools.saveEntityEdit}
        onSelectedIdChange={entityTools.setSelectedEntityId}
        onToggleRawJson={entityTools.toggleRawJson}
        selectedId={entityTools.selectedEntityId}
        sessionToken={props.sessionToken}
        showRawJson={entityTools.showRawJson}
      />

      {entityTools.showRawJson ? (
        <textarea
          className="content-json"
          readOnly
          spellCheck={false}
          value={props.contentJson}
        />
      ) : null}

      {props.contentMessage ? <p className="form-message">{props.contentMessage}</p> : null}

      {props.contentErrors.length > 0 ? (
        <section className="gc-panel content-errors">
          <AlertTriangle size={18} />
          <div>
            {props.contentErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
