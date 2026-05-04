# Goblin Cartel Android

This wrapper is generated with Capacitor and contains the native VK ID bridge used by the web client.

## Local VK ID credentials

Create `vkid.properties` next to this file. It is ignored by git.

```properties
VKIDClientID=123456
VKIDClientSecret=your_vk_id_client_secret
VKIDRedirectHost=vk.ru
VKIDRedirectScheme=vk123456
```

The same values can also be provided through environment variables:

- `VKID_CLIENT_ID`
- `VKID_CLIENT_SECRET`
- `VKID_REDIRECT_HOST`
- `VKID_REDIRECT_SCHEME`

The backend still verifies VK ID through encrypted admin credentials. These Android values are only for the native SDK login flow.

## Java

Capacitor Android uses Java 21 in this project. Android Studio already bundles a compatible JDK under `Android Studio/jbr`; CLI builds should run with `JAVA_HOME` pointing to that JDK or another JDK 21 installation.

## Sync web assets

From the repository root:

```powershell
pnpm --filter @goblin-cartel/game-client build
pnpm --filter @goblin-cartel/game-client cap:sync:android
```

For a local APK that should use production backend APIs:

```powershell
$env:VITE_API_BASE_URL="https://goblin-cartel.murph.ru"
pnpm --filter @goblin-cartel/game-client build
pnpm --filter @goblin-cartel/game-client cap:sync:android
```

Then open the project in Android Studio:

```powershell
pnpm --filter @goblin-cartel/game-client cap:open:android
```
