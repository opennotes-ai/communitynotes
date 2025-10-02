import { NoteRating } from '@prisma/client';
export declare class NoteRatingService {
    createRating(data: {
        noteId: string;
        raterId: string;
        helpful: boolean;
        reason?: string;
        weight?: number;
    }): Promise<NoteRating>;
    getRatingsForNote(noteId: string): Promise<NoteRating[]>;
    getUserRating(noteId: string, raterId: string): Promise<NoteRating | null>;
    getRatingsByUser(raterId: string, limit?: number): Promise<NoteRating[]>;
    deleteRating(noteId: string, raterId: string): Promise<boolean>;
    calculateWeightedScore(noteId: string): Promise<{
        weightedHelpfulScore: number;
        weightedNotHelpfulScore: number;
        totalWeight: number;
        helpfulnessRatio: number;
    }>;
    private getTrustMultiplier;
    getRatingStats(noteId: string): Promise<{
        total: number;
        helpful: number;
        notHelpful: number;
        helpfulnessRatio: number;
        averageWeight: number;
        raterTrustDistribution: Record<string, number>;
    }>;
    getRecentRatings(hours?: number, limit?: number): Promise<NoteRating[]>;
}
//# sourceMappingURL=noteRatingService.d.ts.map