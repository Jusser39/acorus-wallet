import "dotenv/config";
import { buildApp } from "./app";
import { readEnv } from "./env";

const env = readEnv();
const app = buildApp({ env });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutdown_started");

  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, "shutdown_failed");
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

app
  .listen({
    port: env.API_PORT,
    host: env.API_HOST,
  })
  .then(() => {
    app.log.info(
      {
        host: env.API_HOST,
        port: env.API_PORT,
        store: env.ACORUS_ENABLE_PRISMA_STORE ? "prisma" : "memory",
      },
      "api_started",
    );
  })
  .catch((error) => {
    app.log.error({ err: error }, "api_start_failed");
    process.exit(1);
  });
