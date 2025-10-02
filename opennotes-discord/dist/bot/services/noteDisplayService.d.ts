import { EmbedBuilder, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { NoteRating } from '@prisma/client';
import { OpenNoteWithRelations } from '../../database/services/openNoteService.js';
type NoteWithRelations = OpenNoteWithRelations;
export interface NoteDisplayOptions {
    showRatingButtons?: boolean;
    showAuthor?: boolean;
    showSources?: boolean;
    showRatings?: boolean;
    compact?: boolean;
    viewerId?: string;
}
export declare class NoteDisplayService {
    private sourceHandlingService;
    constructor();
    /**
     * Creates a rich embed for displaying an open note
     */
    createNoteEmbed(note: NoteWithRelations, options?: NoteDisplayOptions): EmbedBuilder;
    /**
     * Creates action buttons for note rating
     */
    createRatingButtons(noteId: string, userRating?: NoteRating | null): ActionRowBuilder<ButtonBuilder>;
    /**
     * Creates a compact summary for multiple notes
     */
    createNoteSummaryEmbed(notes: NoteWithRelations[], messageId: string): EmbedBuilder;
    /**
     * Formats rating statistics for display
     */
    private formatRatingStats;
    /**
     * Creates a visual progress bar for percentages
     */
    private createProgressBar;
    /**
     * Formats classification with appropriate emoji
     */
    private formatClassification;
    /**
     * Gets status information for display
     */
    private getStatusInfo;
    /**
     * Gets appropriate color for note status
     */
    private getNoteColor;
    /**
     * Calculates confidence score based on ratings
     */
    private calculateConfidenceScore;
    /**
     * Determines if a note should be automatically displayed
     */
    shouldAutoDisplayNote(note: NoteWithRelations): boolean;
    /**
     * Creates a simple text summary for auto-display
     */
    createAutoDisplaySummary(note: NoteWithRelations): string;
}
export {};
//# sourceMappingURL=noteDisplayService.d.ts.map