import { CredentialsSection } from "./CredentialsSection";
import { useAdminCredentials } from "./useAdminCredentials";

interface CredentialsRouteProps {
  enabled: boolean;
  onMissingSession: () => void;
  sessionToken: string | null;
}

export function CredentialsRoute({ enabled, onMissingSession, sessionToken }: CredentialsRouteProps) {
  const credentialsState = useAdminCredentials({
    enabled,
    onMissingSession,
    sessionToken
  });

  return (
    <CredentialsSection
      busy={credentialsState.busy}
      credentialEnvironment={credentialsState.credentialEnvironment}
      credentialMessage={credentialsState.credentialMessage}
      credentialName={credentialsState.credentialName}
      credentialType={credentialsState.credentialType}
      credentialValue={credentialsState.credentialValue}
      credentials={credentialsState.credentials}
      credentialsLoading={credentialsState.credentialsLoading}
      onCredentialEnvironmentChange={credentialsState.setCredentialEnvironment}
      onCredentialNameChange={credentialsState.setCredentialName}
      onCredentialSubmit={credentialsState.handleCredentialSubmit}
      onCredentialTypeChange={credentialsState.setCredentialType}
      onCredentialValueChange={credentialsState.setCredentialValue}
    />
  );
}
