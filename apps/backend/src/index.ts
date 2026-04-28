import { loadEnv } from "./config/env.js";
import { buildServer } from "./server.js";

const env = loadEnv();
const server = await buildServer(env);

try {
  await server.listen({ host: "0.0.0.0", port: env.port });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
