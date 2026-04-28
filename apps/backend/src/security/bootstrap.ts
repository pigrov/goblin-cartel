export function parseBootstrapEmails(value: string): string[] {
  return value
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter((email) => email.length > 0);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isBootstrapEmail(email: string, bootstrapEmails: readonly string[]): boolean {
  const normalized = normalizeEmail(email);
  return bootstrapEmails.map((item) => normalizeEmail(item)).includes(normalized);
}
