import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { TestDiscordBot } from '../helpers/TestDiscordBot.js';
import { DatabaseHelpers } from '../helpers/DatabaseHelpers.js';

describe('Commands Registration Integration Tests', () => {
  let testBot: TestDiscordBot;
  let dbHelpers: DatabaseHelpers;

  beforeAll(async () => {
    dbHelpers = new DatabaseHelpers();
    await dbHelpers.connect();
    await dbHelpers.cleanDatabase();

    testBot = new TestDiscordBot();
    await testBot.start();
  }, 60000);

  afterAll(async () => {
    await testBot.stop();
    await dbHelpers.disconnect();
  }, 30000);

  describe('Slash commands are registered', () => {
    it('should have registered all slash commands', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      expect(commands).toBeTruthy();
      expect(commands!.size).toBeGreaterThan(0);
    });

    it('should have status command registered', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      const statusCommand = commands?.find(cmd => cmd.name === 'status');
      expect(statusCommand).toBeTruthy();
      expect(statusCommand?.description).toBe('Check bot status and health');
    });

    it('should have verify command registered', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      const verifyCommand = commands?.find(cmd => cmd.name === 'verify');
      expect(verifyCommand).toBeTruthy();
    });

    it('should have verify-code command registered', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      const verifyCodeCommand = commands?.find(cmd => cmd.name === 'verify-code');
      expect(verifyCodeCommand).toBeTruthy();
    });

    it('should have write-note command registered', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      const writeNoteCommand = commands?.find(cmd => cmd.name === 'write-note');
      expect(writeNoteCommand).toBeTruthy();
    });

    it('should have view-notes command registered', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      const viewNotesCommand = commands?.find(cmd => cmd.name === 'view-notes');
      expect(viewNotesCommand).toBeTruthy();
    });

    it('should have notification-settings command registered', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      const notificationSettingsCommand = commands?.find(cmd => cmd.name === 'notification-settings');
      expect(notificationSettingsCommand).toBeTruthy();
    });

    it('should have admin command registered', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      const adminCommand = commands?.find(cmd => cmd.name === 'admin');
      expect(adminCommand).toBeTruthy();
    });
  });

  describe('Context menu commands are registered', () => {
    it('should have Request Open Note context menu command registered', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      const requestNoteCommand = commands?.find(
        cmd => cmd.name === 'Request Open Note' && cmd.type === 3
      );
      expect(requestNoteCommand).toBeTruthy();
    });
  });

  describe('Command metadata is correct', () => {
    it('should have correct command names', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      const commandNames = commands?.map(cmd => cmd.name) ?? [];

      expect(commandNames).toContain('status');
      expect(commandNames).toContain('verify');
      expect(commandNames).toContain('verify-code');
      expect(commandNames).toContain('write-note');
      expect(commandNames).toContain('view-notes');
      expect(commandNames).toContain('notification-settings');
      expect(commandNames).toContain('admin');
      expect(commandNames).toContain('Request Open Note');
    });

    it('should have descriptions for all slash commands', async () => {
      const client = testBot.getClient();
      const commands = await client.application?.commands.fetch();

      const slashCommands = commands?.filter(cmd => cmd.type === 1) ?? [];

      for (const command of slashCommands) {
        expect(command.description).toBeTruthy();
        expect(command.description.length).toBeGreaterThan(0);
      }
    });
  });
});
