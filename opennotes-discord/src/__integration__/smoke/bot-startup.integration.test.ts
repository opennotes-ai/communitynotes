import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { TestDiscordBot } from '../helpers/TestDiscordBot.js';
import { DatabaseHelpers } from '../helpers/DatabaseHelpers.js';
import { redis } from '../../cache/redis.js';
import { natsConnection } from '../../streaming/NatsConnection.js';

describe('Bot Startup Integration Tests', () => {
  let testBot: TestDiscordBot;
  let dbHelpers: DatabaseHelpers;

  beforeAll(async () => {
    dbHelpers = new DatabaseHelpers();
    await dbHelpers.connect();
    await dbHelpers.cleanDatabase();
  });

  afterAll(async () => {
    await dbHelpers.disconnect();
  });

  describe('Bot can start successfully', () => {
    it('should start the bot and connect to all services', async () => {
      testBot = new TestDiscordBot();
      await testBot.start();

      expect(testBot.isReady()).toBe(true);

      const client = testBot.getClient();
      expect(client.isReady()).toBe(true);
      expect(client.user).toBeTruthy();
    }, 60000);

    it('should have connected to database', async () => {
      const prisma = dbHelpers.getPrismaClient();
      await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeTruthy();
    });

    it('should have connected to Redis', async () => {
      expect(redis.isConnected()).toBe(true);
      await redis.set('test-key', 'test-value', 10);
      const value = await redis.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should have connected to NATS', async () => {
      expect(natsConnection.isConnected()).toBe(true);
    });
  });

  describe('Bot can shutdown gracefully', () => {
    it('should stop the bot and disconnect from all services', async () => {
      await testBot.stop();

      expect(testBot.isReady()).toBe(false);
    }, 30000);

    it('should have disconnected from Redis', () => {
      expect(redis.isConnected()).toBe(false);
    });

    it('should have disconnected from NATS', () => {
      expect(natsConnection.isConnected()).toBe(false);
    });
  });
});
