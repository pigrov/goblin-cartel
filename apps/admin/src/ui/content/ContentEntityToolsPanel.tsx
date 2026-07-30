import type { ContentBundle } from "../../api/adminApi";
import { ContentEntityEditor } from "./ContentEntityEditor";
import { ContentEntityKpi, ContentEntityPreview } from "./ContentEntitySummary";
import { ContentTemplateActions } from "./ContentTemplateActions";
import { contentEntityCount } from "./contentPreview";
import type { ContentEntityKind, EntityDraftUpdate } from "./entityRegistry";

export function ContentEntityToolsPanel(props: {
  busy: boolean;
  canEdit: boolean;
  content: ContentBundle | null;
  draftToolMessage: string | null;
  hasSelectedVersion: boolean;
  kind: ContentEntityKind;
  onApplyDraftTool: ContentTemplateActionsProps["onApplyDraftTool"];
  onKindChange: (kind: ContentEntityKind) => void;
  onSaveEntityEdit: (update: EntityDraftUpdate) => void | Promise<void>;
  onSelectedIdChange: (id: string) => void;
  onToggleRawJson: () => void;
  selectedId: string;
  sessionToken: string | null;
  showRawJson: boolean;
}) {
  return (
    <section className="gc-panel content-entity-tools">
      <header>
        <div>
          <strong>Сущности контента</strong>
          <span>{props.content ? "Формы сохраняют draft через серверную проверку" : "JSON пока не разобран"}</span>
        </div>
        <ContentTemplateActions
          canEdit={props.canEdit}
          hasSelectedVersion={props.hasSelectedVersion}
          onApplyDraftTool={props.onApplyDraftTool}
          onToggleRawJson={props.onToggleRawJson}
          showRawJson={props.showRawJson}
        />
      </header>

      <div className="content-entity-kpis" aria-label="Счетчики сущностей">
        <ContentEntityKpi label="Ресурсы" value={contentEntityCount(props.content, "resources")} />
        <ContentEntityKpi label="Блоки" value={contentEntityCount(props.content, "blockTypes")} />
        <ContentEntityKpi label="Жилы" value={contentEntityCount(props.content, "veinTypes")} />
        <ContentEntityKpi label="Типы шахт" value={contentEntityCount(props.content, "builtMineTypes")} />
        <ContentEntityKpi label="Рудники" value={contentEntityCount(props.content, "mineTemplates")} />
        <ContentEntityKpi label="Карты" value={contentEntityCount(props.content, "bossCards")} />
        <ContentEntityKpi label="Гоблины" value={props.content?.goblins ? 1 : 0} />
        <ContentEntityKpi label="Хижина" value={props.content?.goblinHut ? 1 : 0} />
        <ContentEntityKpi label="Подъемник" value={props.content?.elevator ? 1 : 0} />
      </div>

      {props.content ? (
        <ContentEntityEditor
          busy={props.busy}
          canEdit={props.canEdit && props.hasSelectedVersion}
          content={props.content}
          kind={props.kind}
          onApply={props.onSaveEntityEdit}
          onKindChange={props.onKindChange}
          onSelectedIdChange={props.onSelectedIdChange}
          selectedId={props.selectedId}
          sessionToken={props.sessionToken}
        />
      ) : null}

      {props.content ? <ContentEntityPreview content={props.content} /> : null}
      {props.draftToolMessage ? <p className="content-tool-message">{props.draftToolMessage}</p> : null}
    </section>
  );
}

type ContentTemplateActionsProps = Parameters<typeof ContentTemplateActions>[0];
