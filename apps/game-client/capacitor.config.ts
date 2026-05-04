import type { CapacitorConfig } from "@capacitor/cli";

const remoteServerUrl = readEnv("CAPACITOR_REMOTE_URL");

const config: CapacitorConfig = {
  appId: "ru.murph.goblincartel",
  appName: "Goblin Cartel",
  webDir: "dist",
  server: remoteServerUrl
    ? {
        url: remoteServerUrl
      }
    : {
        androidScheme: "https"
      }
};

export default config;

function readEnv(name: string): string {
  const env = (globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>;
    };
  }).process?.env;

  return env?.[name]?.trim() ?? "";
}
