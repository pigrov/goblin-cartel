import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.murph.goblincartel",
  appName: "Goblin Cartel",
  webDir: "dist",
  server: {
    androidScheme: "https"
  }
};

export default config;
