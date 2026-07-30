import { type ContentVersion } from "../../api/adminApi";
import { ContentSection } from "./ContentSection";
import { useAdminContent } from "./useAdminContent";

interface ContentRouteProps {
  contentVersionSlug: string | null;
  enabled: boolean;
  onMissingSession: () => void;
  onOpenContentList: () => void;
  onOpenVersion: (version: ContentVersion) => void;
  sessionToken: string | null;
}

export function ContentRoute({
  contentVersionSlug,
  enabled,
  onMissingSession,
  onOpenContentList,
  onOpenVersion,
  sessionToken
}: ContentRouteProps) {
  const contentState = useAdminContent({
    contentVersionSlug,
    enabled,
    onMissingSession,
    onOpenVersion,
    sessionToken
  });

  return (
    <ContentSection
      busy={contentState.busy}
      contentErrors={contentState.contentErrors}
      contentJson={contentState.contentJson}
      contentLoading={contentState.contentLoading}
      contentMessage={contentState.contentMessage}
      contentNotes={contentState.contentNotes}
      contentVersionName={contentState.contentVersionName}
      contentVersions={contentState.contentVersions}
      onContentNotesChange={contentState.setContentNotes}
      onContentVersionNameChange={contentState.setContentVersionName}
      onCreateContentVersion={contentState.handleCreateContentVersion}
      onOpenContentList={onOpenContentList}
      onPublishContent={contentState.handlePublishContent}
      onSaveContentEntity={contentState.handleSaveContentEntity}
      onSelectContentVersion={contentState.handleSelectContentVersion}
      onValidateContent={contentState.handleValidateContent}
      selectedContentVersion={contentState.selectedContentVersion}
      sessionToken={sessionToken}
    />
  );
}
