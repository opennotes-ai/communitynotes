import { Client } from 'discord.js';
import { DiscordBot } from '../../bot/client.js';
import { connectDatabase, disconnectDatabase } from '../../database/index.js';
import { redis } from '../../cache/redis.js';
import { natsConnection } from '../../streaming/NatsConnection.js';
import { logger } from '../../shared/utils/logger.js';

export class TestDiscordBot {
  private bot: DiscordBot | null = null;
  private isStarted = false;

  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('Bot is already started');
    }

    try {
      await connectDatabase();
      await redis.connect();
      await natsConnection.connect();

      this.bot = new DiscordBot();
      await this.bot.start();

      await this.waitForReady();

      this.isStarted = true;
    } catch (error) {
      logger.error('Failed to start test bot', { error });
      await this.cleanup();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    await this.cleanup();
    this.isStarted = false;
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.bot) {
        await this.bot.stop();
        this.bot = null;
      }

      await redis.disconnect();
      await natsConnection.disconnect();
      await disconnectDatabase();
    } catch (error) {
      logger.error('Error during test bot cleanup', { error });
    }
  }

  private async waitForReady(timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.bot && this.bot.getStatus().ready) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Bot did not become ready within timeout');
  }

  getClient(): Client {
    if (!this.bot) {
      throw new Error('Bot is not started');
    }
    return this.bot.client;
  }

  getBot(): DiscordBot {
    if (!this.bot) {
      throw new Error('Bot is not started');
    }
    return this.bot;
  }

  isReady(): boolean {
    return this.isStarted && this.bot !== null && this.bot.getStatus().ready;
  }
}
