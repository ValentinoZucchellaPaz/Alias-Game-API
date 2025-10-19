import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Sequelize } from "sequelize";
import { redisClient } from "../config/redis.js";

// Disable redis mocks for this file
vi.unmock("../../src/config/redis.js");
let sequelize;
let redisConnected = false;
let dbConnected = false;

// Initialize Postgres and Redis connection and close them when finished
describe("Correct connection to Postgres and Redis", () => {
  beforeAll(async () => {
    // try postgres connection
    try {
      sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
        host: process.env.DB_HOST || "localhost",
        dialect: "postgres",
        port: process.env.DB_PORT || 5432,
        logging: false,
        dialectOptions: {
          connectTimeout: 3000,
        },
      });

      await sequelize.authenticate();
      dbConnected = true;
    } catch (err) {
      console.error("❌ Cannot connect to Postgres:", err.message);
    }

    // try redis connection
    try {
      await redisClient.connectRedis(2000);
      await redisClient.client.ping();
      redisConnected = true;
    } catch (err) {
      console.error("❌ Redis unavailable:", err.message);
    }

    // dont run tests if any is not connected
    if (!dbConnected || !redisConnected) {
      throw new Error(
        "Infrastructure not available. Chek if Redis and Postgres containers are running."
      );
    }
  }, 8000); // timeout total 8s

  afterAll(async () => {
    if (dbConnected) await sequelize.close();
    if (redisConnected) await redisClient.disconnect();
  });

  it("PostgreSQL available and answer SELECT 1", async () => {
    if (!dbConnected) return;
    const [result] = await sequelize.query("SELECT 1;");
    expect(result).toBeDefined();
  });

  it("Redis available and answer get/set", async () => {
    if (!redisConnected) return;
    const testKey = "health:test";
    const testValue = { ok: true };

    await redisClient.set(testKey, testValue);
    const value = await redisClient.get(testKey);

    expect(value).toEqual(testValue);

    await redisClient.del(testKey);
  });
});
