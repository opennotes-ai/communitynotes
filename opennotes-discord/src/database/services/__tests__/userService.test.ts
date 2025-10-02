import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { User } from '@prisma/client';

const mockFindUnique = jest.fn<any>();
const mockCreate = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockFindMany = jest.fn<any>();

jest.unstable_mockModule('../../client.js', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      findMany: mockFindMany,
    },
  },
}));

jest.unstable_mockModule('../../../shared/utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const { UserService } = await import('../userService.js');

describe('UserService', () => {
  let userService: InstanceType<typeof UserService>;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('findByDiscordId', () => {
    it('should find user by Discord ID', async () => {
      const mockUser: Partial<User> = {
        id: '1',
        discordId: '12345',
        username: 'testuser',
        helpfulnessScore: 0,
        totalNotes: 0,
        totalRatings: 0,
        dailyRequestCount: 0,
        trustLevel: 'newcomer',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      };

      mockFindUnique.mockResolvedValue(mockUser);

      const result = await userService.findByDiscordId('12345');

      expect(result).toEqual(mockUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { discordId: '12345' },
        include: {
          serverMemberships: {
            include: {
              server: true,
            },
          },
        },
      });
    });

    it('should return null if user not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await userService.findByDiscordId('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      const dbError = new Error('Database connection failed');
      mockFindUnique.mockRejectedValue(dbError);

      await expect(userService.findByDiscordId('12345')).rejects.toThrow('Database connection failed');
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        discordId: '12345',
        username: 'newuser',
        discriminator: '0001',
        avatar: 'avatar_url',
      };

      const mockCreatedUser: Partial<User> = {
        id: '1',
        ...userData,
        helpfulnessScore: 0,
        totalNotes: 0,
        totalRatings: 0,
        dailyRequestCount: 0,
        trustLevel: 'newcomer',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      };

      mockCreate.mockResolvedValue(mockCreatedUser);

      const result = await userService.createUser(userData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockCreate).toHaveBeenCalledWith({
        data: userData,
      });
    });
  });

  describe('updateHelpfulnessScore', () => {
    it('should increment helpfulness score', async () => {
      const mockUpdatedUser: Partial<User> = {
        id: '1',
        discordId: '12345',
        username: 'testuser',
        helpfulnessScore: 10,
        totalNotes: 5,
        totalRatings: 10,
        dailyRequestCount: 0,
        trustLevel: 'regular',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      };

      mockUpdate.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateHelpfulnessScore('1', 5);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          helpfulnessScore: {
            increment: 5,
          },
        },
      });
    });

    it('should decrement helpfulness score for negative values', async () => {
      const mockUpdatedUser: Partial<User> = {
        id: '1',
        discordId: '12345',
        username: 'testuser',
        helpfulnessScore: 5,
        totalNotes: 5,
        totalRatings: 10,
        dailyRequestCount: 0,
        trustLevel: 'regular',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      };

      mockUpdate.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateHelpfulnessScore('1', -3);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          helpfulnessScore: {
            increment: -3,
          },
        },
      });
    });
  });

  describe('getTopContributors', () => {
    it('should return top contributors ordered by helpfulness', async () => {
      const mockUsers: Partial<User>[] = [
        {
          id: '1',
          discordId: '111',
          username: 'user1',
          helpfulnessScore: 100,
          totalNotes: 50,
          totalRatings: 100,
          dailyRequestCount: 0,
          trustLevel: 'expert',
          joinedAt: new Date(),
          lastActiveAt: new Date(),
        },
        {
          id: '2',
          discordId: '222',
          username: 'user2',
          helpfulnessScore: 80,
          totalNotes: 40,
          totalRatings: 80,
          dailyRequestCount: 0,
          trustLevel: 'trusted',
          joinedAt: new Date(),
          lastActiveAt: new Date(),
        },
      ];

      mockFindMany.mockResolvedValue(mockUsers);

      const result = await userService.getTopContributors(10);

      expect(result).toEqual(mockUsers);
      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: [
          { helpfulnessScore: 'desc' },
          { totalNotes: 'desc' },
          { totalRatings: 'desc' },
        ],
        take: 10,
        where: {
          totalNotes: { gt: 0 },
        },
      });
    });

    it('should respect custom limit parameter', async () => {
      mockFindMany.mockResolvedValue([]);

      await userService.getTopContributors(5);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });
});
