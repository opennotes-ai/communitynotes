import { describe, it, expect } from '@jest/globals';
import { DiscordServerConfigSchema } from '../discord.js';

describe('Discord Type Schemas', () => {
  describe('DiscordServerConfigSchema', () => {
    it('should validate minimal config', () => {
      const config = {
        serverId: '123456789',
      };
      expect(() => DiscordServerConfigSchema.parse(config)).not.toThrow();
    });

    it('should apply default values', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
      });

      expect(config.enabled).toBe(true);
      expect(config.enabledChannels).toEqual([]);
      expect(config.disabledChannels).toEqual([]);
      expect(config.moderatorRoles).toEqual([]);
      expect(config.contributorRoles).toEqual([]);
    });

    it('should apply default settings', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
      });

      expect(config.settings.allowNoteRequests).toBe(true);
      expect(config.settings.allowNoteCreation).toBe(true);
      expect(config.settings.maxRequestsPerUser).toBe(5);
      expect(config.settings.requireVerification).toBe(true);
    });

    it('should accept custom enabled value', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
        enabled: false,
      });
      expect(config.enabled).toBe(false);
    });

    it('should accept enabled channels', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
        enabledChannels: ['channel1', 'channel2'],
      });
      expect(config.enabledChannels).toEqual(['channel1', 'channel2']);
    });

    it('should accept disabled channels', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
        disabledChannels: ['channel3', 'channel4'],
      });
      expect(config.disabledChannels).toEqual(['channel3', 'channel4']);
    });

    it('should accept moderator roles', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
        moderatorRoles: ['role1', 'role2'],
      });
      expect(config.moderatorRoles).toEqual(['role1', 'role2']);
    });

    it('should accept contributor roles', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
        contributorRoles: ['role3'],
      });
      expect(config.contributorRoles).toEqual(['role3']);
    });

    it('should accept custom settings', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
        settings: {
          allowNoteRequests: false,
          allowNoteCreation: false,
          maxRequestsPerUser: 10,
          requireVerification: false,
        },
      });
      expect(config.settings.allowNoteRequests).toBe(false);
      expect(config.settings.allowNoteCreation).toBe(false);
      expect(config.settings.maxRequestsPerUser).toBe(10);
      expect(config.settings.requireVerification).toBe(false);
    });

    it('should accept partial settings', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
        settings: {
          maxRequestsPerUser: 3,
        },
      });
      expect(config.settings.maxRequestsPerUser).toBe(3);
      expect(config.settings.allowNoteRequests).toBe(true);
      expect(config.settings.allowNoteCreation).toBe(true);
      expect(config.settings.requireVerification).toBe(true);
    });

    it('should accept complete config', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
        enabled: true,
        enabledChannels: ['channel1', 'channel2'],
        disabledChannels: ['channel3'],
        moderatorRoles: ['mod1', 'mod2'],
        contributorRoles: ['contrib1'],
        settings: {
          allowNoteRequests: true,
          allowNoteCreation: false,
          maxRequestsPerUser: 7,
          requireVerification: true,
        },
      });

      expect(config.serverId).toBe('123456789');
      expect(config.enabled).toBe(true);
      expect(config.enabledChannels).toHaveLength(2);
      expect(config.disabledChannels).toHaveLength(1);
      expect(config.moderatorRoles).toHaveLength(2);
      expect(config.contributorRoles).toHaveLength(1);
      expect(config.settings.maxRequestsPerUser).toBe(7);
    });

    it('should require serverId', () => {
      expect(() => DiscordServerConfigSchema.parse({})).toThrow();
    });

    it('should accept serverId as string', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '987654321',
      });
      expect(config.serverId).toBe('987654321');
    });

    it('should handle empty arrays in channels and roles', () => {
      const config = DiscordServerConfigSchema.parse({
        serverId: '123456789',
        enabledChannels: [],
        disabledChannels: [],
        moderatorRoles: [],
        contributorRoles: [],
      });
      expect(config.enabledChannels).toEqual([]);
      expect(config.disabledChannels).toEqual([]);
      expect(config.moderatorRoles).toEqual([]);
      expect(config.contributorRoles).toEqual([]);
    });
  });

  describe('MessageContext interface', () => {
    it('should match expected structure', () => {
      const messageContext = {
        messageId: 'msg123',
        channelId: 'channel123',
        serverId: 'server123',
        authorId: 'author123',
        content: 'Test message',
        timestamp: new Date(),
        attachments: ['url1', 'url2'],
      };

      expect(messageContext.messageId).toBeDefined();
      expect(messageContext.channelId).toBeDefined();
      expect(messageContext.serverId).toBeDefined();
      expect(messageContext.authorId).toBeDefined();
      expect(messageContext.content).toBeDefined();
      expect(messageContext.timestamp).toBeInstanceOf(Date);
      expect(messageContext.attachments).toBeInstanceOf(Array);
    });

    it('should allow optional attachments', () => {
      const messageContext: any = {
        messageId: 'msg123',
        channelId: 'channel123',
        serverId: 'server123',
        authorId: 'author123',
        content: 'Test message',
        timestamp: new Date(),
      };

      expect(messageContext.attachments).toBeUndefined();
    });
  });

  describe('NoteRequest interface', () => {
    it('should match expected structure', () => {
      const noteRequest = {
        id: 'req123',
        messageId: 'msg123',
        requestorId: 'user123',
        timestamp: new Date(),
        sources: ['url1', 'url2'],
        reason: 'Misinformation',
      };

      expect(noteRequest.id).toBeDefined();
      expect(noteRequest.messageId).toBeDefined();
      expect(noteRequest.requestorId).toBeDefined();
      expect(noteRequest.timestamp).toBeInstanceOf(Date);
      expect(noteRequest.sources).toBeInstanceOf(Array);
      expect(noteRequest.reason).toBeDefined();
    });

    it('should allow optional sources and reason', () => {
      const noteRequest: any = {
        id: 'req123',
        messageId: 'msg123',
        requestorId: 'user123',
        timestamp: new Date(),
      };

      expect(noteRequest.sources).toBeUndefined();
      expect(noteRequest.reason).toBeUndefined();
    });
  });

  describe('OpenNote interface', () => {
    it('should match expected structure', () => {
      const openNote = {
        id: 'note123',
        messageId: 'msg123',
        authorId: 'author123',
        content: 'This is misleading',
        classification: 'misleading',
        sources: ['url1', 'url2'],
        status: 'crh',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(openNote.id).toBeDefined();
      expect(openNote.classification).toBe('misleading');
      expect(openNote.status).toBe('crh');
    });

    it('should support all classification types', () => {
      const classifications = ['misleading', 'lacking-context', 'disputed', 'unsubstantiated'];

      classifications.forEach(classification => {
        const note = {
          id: 'note123',
          messageId: 'msg123',
          authorId: 'author123',
          content: 'Note content',
          classification: classification as any,
          sources: [],
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        expect(note.classification).toBe(classification);
      });
    });

    it('should support all status types', () => {
      const statuses = ['pending', 'crh', 'nrh', 'needs-more-ratings'];

      statuses.forEach(status => {
        const note = {
          id: 'note123',
          messageId: 'msg123',
          authorId: 'author123',
          content: 'Note content',
          classification: 'misleading',
          sources: [],
          status: status as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        expect(note.status).toBe(status);
      });
    });
  });

  describe('NoteRating interface', () => {
    it('should match expected structure', () => {
      const rating = {
        id: 'rating123',
        noteId: 'note123',
        raterId: 'rater123',
        helpful: true,
        timestamp: new Date(),
        reason: 'Clear and accurate',
      };

      expect(rating.id).toBeDefined();
      expect(rating.noteId).toBeDefined();
      expect(rating.raterId).toBeDefined();
      expect(rating.helpful).toBe(true);
      expect(rating.timestamp).toBeInstanceOf(Date);
    });

    it('should allow optional reason', () => {
      const rating: any = {
        id: 'rating123',
        noteId: 'note123',
        raterId: 'rater123',
        helpful: false,
        timestamp: new Date(),
      };

      expect(rating.reason).toBeUndefined();
    });

    it('should support boolean helpful values', () => {
      const ratingTrue = {
        id: 'rating123',
        noteId: 'note123',
        raterId: 'rater123',
        helpful: true,
        timestamp: new Date(),
      };

      const ratingFalse = {
        id: 'rating456',
        noteId: 'note456',
        raterId: 'rater456',
        helpful: false,
        timestamp: new Date(),
      };

      expect(ratingTrue.helpful).toBe(true);
      expect(ratingFalse.helpful).toBe(false);
    });
  });

  describe('BotStatus interface', () => {
    it('should match expected structure', () => {
      const status = {
        ready: true,
        guilds: 5,
        users: 1000,
        uptime: 3600000,
        ping: 50,
      };

      expect(status.ready).toBe(true);
      expect(status.guilds).toBe(5);
      expect(status.users).toBe(1000);
      expect(status.uptime).toBe(3600000);
      expect(status.ping).toBe(50);
    });

    it('should support null uptime', () => {
      const status = {
        ready: false,
        guilds: 0,
        users: 0,
        uptime: null,
        ping: 0,
      };

      expect(status.uptime).toBeNull();
    });

    it('should support ready states', () => {
      const readyStatus = {
        ready: true,
        guilds: 10,
        users: 5000,
        uptime: 7200000,
        ping: 30,
      };

      const notReadyStatus = {
        ready: false,
        guilds: 0,
        users: 0,
        uptime: null,
        ping: 0,
      };

      expect(readyStatus.ready).toBe(true);
      expect(notReadyStatus.ready).toBe(false);
    });
  });
});
