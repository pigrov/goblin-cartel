import { AdminAuthRoute } from "./auth/AdminAuthRoute";
import { useAdminSession } from "./auth/useAdminSession";
import { ContentRoute } from "./content/ContentRoute";
import { CredentialsRoute } from "./credentials/CredentialsRoute";
import { AdminDashboard } from "./shell/AdminDashboard";
import { AdminShell } from "./shell/AdminShell";
import { useAdminRoute } from "./shell/useAdminRoute";
export { createMineVisualRows, getMineVisualCell } from "./content/editors/mineTemplatesEditor";
export { applyBossCardDropBalanceToFormState } from "./content/editors/rewardChestTypesEditor";
export {
  addDraftBlockTypeTemplate,
  addDraftBossCardTemplate,
  addDraftMineTemplate,
  addDraftRewardChestTypeTemplate
} from "./content/draftTemplates";
export { adminContentVersionPath, adminSectionPath, readAdminRoutePath } from "./shell/adminRoutes";

export function App() {
  const { activeSection, contentVersionSlug, navigateToContentList, navigateToContentVersion, navigateToSection } =
    useAdminRoute();
  const adminSession = useAdminSession();
  const { clearSession, handleLogout, loadingSession, sessionToken, user } = adminSession;
  const contentEnabled = Boolean(sessionToken && user && !user.mustSetPassword && activeSection === "content");
  const credentialsEnabled = Boolean(sessionToken && user && !user.mustSetPassword && activeSection === "credentials");

  if (loadingSession || !user || user.mustSetPassword) {
    return <AdminAuthRoute session={adminSession} />;
  }

  return (
    <AdminShell activeSection={activeSection} onLogout={handleLogout} onNavigate={navigateToSection} userEmail={user.email}>
      {activeSection === "content" ? (
        <ContentRoute
          contentVersionSlug={contentVersionSlug}
          enabled={contentEnabled}
          onMissingSession={clearSession}
          onOpenContentList={navigateToContentList}
          onOpenVersion={navigateToContentVersion}
          sessionToken={sessionToken}
        />
      ) : activeSection === "credentials" ? (
        <CredentialsRoute enabled={credentialsEnabled} onMissingSession={clearSession} sessionToken={sessionToken} />
      ) : (
        <AdminDashboard />
      )}
    </AdminShell>
  );
}
