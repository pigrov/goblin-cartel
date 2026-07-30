import { type FormEvent, useEffect, useState } from "react";

import {
  apiRequest,
  type CredentialEnvironment,
  type CredentialItem,
  type CredentialType
} from "../../api/adminApi";

interface UseAdminCredentialsOptions {
  enabled: boolean;
  onMissingSession: () => void;
  sessionToken: string | null;
}

export function useAdminCredentials({ enabled, onMissingSession, sessionToken }: UseAdminCredentialsOptions) {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialName, setCredentialName] = useState("");
  const [credentialType, setCredentialType] = useState<CredentialType>("api_key");
  const [credentialEnvironment, setCredentialEnvironment] = useState<CredentialEnvironment>("production");
  const [credentialValue, setCredentialValue] = useState("");
  const [credentialMessage, setCredentialMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !sessionToken) {
      return;
    }

    const token = sessionToken;

    async function loadCredentials() {
      setCredentialsLoading(true);
      setCredentialMessage(null);

      try {
        const response = await apiRequest<{ credentials: CredentialItem[] }>("/admin/credentials", {
          token
        });
        setCredentials(response.credentials);
      } catch (error) {
        setCredentialMessage(error instanceof Error ? error.message : "Не удалось загрузить credentials.");
      } finally {
        setCredentialsLoading(false);
      }
    }

    void loadCredentials();
  }, [enabled, sessionToken]);

  async function handleCredentialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionToken) {
      onMissingSession();
      return;
    }

    setBusy(true);
    setCredentialMessage(null);

    try {
      const response = await apiRequest<{ credential: CredentialItem }>("/admin/credentials", {
        method: "POST",
        token: sessionToken,
        body: {
          name: credentialName,
          type: credentialType,
          environment: credentialEnvironment,
          value: credentialValue
        }
      });

      setCredentials((current) =>
        [response.credential, ...current.filter((item) => item.id !== response.credential.id)].sort((left, right) =>
          left.name.localeCompare(right.name)
        )
      );
      setCredentialValue("");
      setCredentialMessage("Credential сохранен. Значение скрыто и хранится зашифрованным.");
    } catch (error) {
      setCredentialMessage(error instanceof Error ? error.message : "Не удалось сохранить credential.");
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    credentialEnvironment,
    credentialMessage,
    credentialName,
    credentialType,
    credentialValue,
    credentials,
    credentialsLoading,
    handleCredentialSubmit,
    setCredentialEnvironment,
    setCredentialName,
    setCredentialType,
    setCredentialValue
  };
}
