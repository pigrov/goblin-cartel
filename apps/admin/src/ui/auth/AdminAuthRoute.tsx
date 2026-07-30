import { AdminAuthGate } from "./AdminAuthGate";
import type { useAdminSession } from "./useAdminSession";

type AdminSessionState = ReturnType<typeof useAdminSession>;

interface AdminAuthRouteProps {
  session: AdminSessionState;
}

export function AdminAuthRoute({ session }: AdminAuthRouteProps) {
  return (
    <AdminAuthGate
      authMode={session.authMode}
      busy={session.busy}
      email={session.email}
      loadingSession={session.loadingSession}
      message={session.message}
      newPassword={session.newPassword}
      onAuthModeChange={session.setAuthMode}
      onAuthSubmit={session.handleAuthSubmit}
      onEmailChange={session.setEmail}
      onNewPasswordChange={session.setNewPassword}
      onPasswordChange={session.setPassword}
      onPasswordSubmit={session.handlePasswordSubmit}
      password={session.password}
      user={session.user}
    />
  );
}
