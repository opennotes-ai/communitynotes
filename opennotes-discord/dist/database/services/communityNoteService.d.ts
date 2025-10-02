import { CommunityNote, NoteRating } from '@prisma/client';
export type CommunityNoteWithRelations = CommunityNote & {
    author: {
        id: string;
        discordId: string;
        username: string;
        helpfulnessScore: number;
        trustLevel: string;
    };
    ratings: (NoteRating & {
        rater: {
            id: string;
            discordId: string;
            username: string;
            trustLevel: string;
        };
    })[];
};
export declare class CommunityNoteService {
    createNote(data: {
        messageId: string;
        authorId: string;
        content: string;
        classification: string;
        sources: string[];
    }): Promise<CommunityNote>;
    findById(id: string): Promise<CommunityNoteWithRelations | null>;
    getNotesForMessage(messageId: string, visibleOnly?: boolean): Promise<CommunityNoteWithRelations[]>;
    updateNoteStatus(noteId: string, status: string): Promise<CommunityNote>;
    updateVisibility(noteId: string, isVisible: boolean, visibilityScore?: number): Promise<CommunityNote>;
    recalculateRatingStats(noteId: string): Promise<CommunityNote>;
    getNotesByAuthor(authorId: string, limit?: number): Promise<CommunityNote[]>;
    getPendingNotes(serverId?: string, limit?: number): Promise<CommunityNote[]>;
    getTopNotes(serverId?: string, days?: number, limit?: number): Promise<CommunityNote[]>;
    deleteNote(noteId: string): Promise<void>;
    getNoteStats(noteId: string): Promise<{
        helpfulCount: number;
        notHelpfulCount: number;
        totalRatings: number;
        helpfulnessRatio: number;
        isVisible: boolean;
        status: string;
    }>;
}
//# sourceMappingURL=communityNoteService.d.ts.map