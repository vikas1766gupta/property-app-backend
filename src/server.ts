import { buildApp } from "./app";
import { env } from "@config/env";
import { logger } from "@common/logger/logger";
import { Server } from "node:http";

const app = buildApp();
const server: Server = app.listen(env.port, () => {
  logger.info("Server listening", { port: env.port, nodeEnv: env.nodeEnv });
});

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Graceful shutdown started", { signal });
  server.close(async () => {
    await app.locals.emailQueue.close();
    await app.locals.prisma.$disconnect();
    logger.info("Graceful shutdown complete");
  });
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
