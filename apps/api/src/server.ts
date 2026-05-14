import "dotenv/config";
import { buildApp } from "./app";
import { readEnv } from "./env";

const env = readEnv();
const app = buildApp({ env });

app
  .listen({
    port: env.API_PORT,
    host: "0.0.0.0",
  })
  .catch((error) => {
    app.log.error(error);
    process.exitCode = 1;
  });
