import { User } from '@prisma/client';
export declare class UserService {
    findByDiscordId(discordId: string): Promise<User | null>;
    createUser(data: {
        discordId: string;
        username: string;
        discriminator?: string;
        avatar?: string;
    }): Promise<User>;
    updateUser(discordId: string, data: Partial<Pick<User, 'username' | 'discriminator' | 'avatar' | 'lastActiveAt'>>): Promise<User>;
    updateHelpfulnessScore(userId: string, scoreChange: number): Promise<User>;
    incrementDailyRequestCount(userId: string): Promise<User>;
    getDailyRequestCount(userId: string): Promise<number>;
    updateTrustLevel(userId: string, trustLevel: string): Promise<User>;
    getTopContributors(limit?: number): Promise<User[]>;
    getUserStats(userId: string): Promise<{
        totalNotes: number;
        totalRatings: number;
        helpfulnessScore: number;
        trustLevel: string;
        recentNotes: number;
    }>;
    incrementNoteCount(userId: string): Promise<User>;
}
//# sourceMappingURL=userService.d.ts.map