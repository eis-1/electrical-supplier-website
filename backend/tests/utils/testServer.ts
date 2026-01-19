import type { Server } from "http";

import { createApp } from "../../src/app";
import { connectDatabase, disconnectDatabase } from "../../src/config/db";
import { initRedis, closeRedis } from "../../src/config/redis";
import {
  initializeRateLimiters,
  shutdownRateLimiters,
} from "../../src/middlewares/rateLimit.middleware";

export type TestServerContext = {
  server: Server;
  baseUrl: string;
  close: () => Promise<void>;
};

export async function startTestServer(): Promise<TestServerContext> {
  // Ensure environment behaves as test by default.
  process.env.NODE_ENV = process.env.NODE_ENV || "test";

  await connectDatabase();
  await initRedis();
  initializeRateLimiters();

  const app = createApp();

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    throw new Error("Test server failed to start (no address)");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  const close = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    await shutdownRateLimiters();
    await closeRedis();
    await disconnectDatabase();
  };

  return { server, baseUrl, close };
}
