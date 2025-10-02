import { OpenNote, NoteRating } from '@prisma/client';
export type OpenNoteWithRelations = OpenNote & {
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
export declare class OpenNoteService {
    createNote(data: {
        messageId: string;
        authorId: string;
        content: string;
        classification: string;
        sources: string[];
    }): Promise<OpenNote>;
    findById(id: string): Promise<OpenNoteWithRelations | null>;
    getNotesForMessage(messageId: string, visibleOnly?: boolean): Promise<OpenNoteWithRelations[]>;
    updateNoteStatus(noteId: string, status: string): Promise<OpenNote>;
    updateVisibility(noteId: string, isVisible: boolean, visibilityScore?: number): Promise<OpenNote>;
    recalculateRatingStats(noteId: string): Promise<OpenNote>;
    getNotesByAuthor(authorId: string, limit?: number): Promise<OpenNote[]>;
    getPendingNotes(serverId?: string, limit?: number): Promise<OpenNote[]>;
    getTopNotes(serverId?: string, days?: number, limit?: number): Promise<OpenNote[]>;
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
//# sourceMappingURL=openNoteService.d.ts.map