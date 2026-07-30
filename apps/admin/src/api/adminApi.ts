export interface AdminUser {
  id: string;
  email: string;
  role: string;
  mustSetPassword: boolean;
}

export interface AuthResponse {
  token: string;
  user: AdminUser;
}

export interface AssetUploadResponse {
  asset: {
    assetId: string;
    fileName: string;
    mimeType: string;
    size: number;
    updatedAt: string;
    url: string;
  };
}

export interface CredentialItem {
  id: string;
  name: string;
  type: CredentialType;
  environment: CredentialEnvironment;
  hasValue: true;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CredentialType = "api_key" | "oauth" | "smtp" | "storage" | "analytics" | "push" | "json" | "secret";
export type CredentialEnvironment = "production" | "staging" | "development";

export interface ContentVersion {
  id: string;
  version: string;
  status: "draft" | "validated" | "published" | "archived" | string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export type ContentRecord = Record<string, unknown>;

export interface ContentBundle {
  resources: ContentRecord[];
  blockTypes: ContentRecord[];
  veinTypes?: ContentRecord[];
  builtMineTypes?: ContentRecord[];
  rewardChestTypes?: ContentRecord[];
  bossCards?: ContentRecord[];
  mineTemplates: ContentRecord[];
  uiIcons?: ContentRecord;
  goblins?: ContentRecord;
  goblinHut: ContentRecord;
  elevator: ContentRecord;
  localization?: Record<string, Record<string, string>>;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT";
    token?: string;
    body?: Record<string, unknown>;
  } = {}
): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorPayload = payload as { error?: string; validation?: { errors?: string[] } };
    throw new ApiRequestError(
      messageForApiError(errorPayload.error),
      Array.isArray(errorPayload.validation?.errors) ? errorPayload.validation.errors : []
    );
  }

  return payload as T;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly validationErrors: string[] = []
  ) {
    super(message);
  }
}

function messageForApiError(error?: string): string {
  switch (error) {
    case "bootstrap_email_not_allowed":
      return "Этот email не входит в список bootstrap-доступа.";
    case "password_required":
      return "Для этого email уже нужен вход по паролю.";
    case "invalid_credentials":
      return "Email или пароль не подошли.";
    case "invalid_payload":
      return "Проверь email и пароль.";
    case "invalid_asset_payload":
      return "Проверь Asset ID и формат файла.";
    case "invalid_asset_file":
      return "Файл рендера не подходит или больше 5 MB.";
    case "asset_not_found":
      return "Ассет не найден.";
    case "invalid_session":
      return "Сессия истекла. Войди заново.";
    case "password_setup_required":
      return "Сначала нужно установить пароль.";
    case "content_version_not_found":
      return "Версия контента не найдена.";
    case "version_not_editable":
      return "Эту версию уже нельзя редактировать.";
    case "invalid_content":
      return "Контент не прошел проверку схемы.";
    default:
      return "Запрос не прошел.";
  }
}
