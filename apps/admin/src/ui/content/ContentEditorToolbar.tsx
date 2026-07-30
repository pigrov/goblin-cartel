import { CheckCircle2, Send } from "lucide-react";

import type { ContentVersion } from "../../api/adminApi";
import { formatDateTime } from "./contentPreview";

export function ContentEditorToolbar(props: {
  busy: boolean;
  canEdit: boolean;
  onOpenContentList: () => void;
  onPublishContent: () => void;
  onValidateContent: () => void;
  selectedContentVersion: ContentVersion;
}) {
  return (
    <div className="gc-panel content-toolbar">
      <div className="content-toolbar-title">
        <button onClick={props.onOpenContentList} type="button">
          Версии
        </button>
        <div>
          <strong>{props.selectedContentVersion.version}</strong>
          <span>{formatDateTime(props.selectedContentVersion.updatedAt)}</span>
        </div>
      </div>
      <div className="content-actions">
        <button disabled={!props.canEdit || props.busy} onClick={props.onValidateContent} type="button">
          <CheckCircle2 size={17} />
          Validate
        </button>
        <button disabled={!props.canEdit || props.busy} onClick={props.onPublishContent} type="button">
          <Send size={17} />
          Publish
        </button>
      </div>
    </div>
  );
}
