import { ChatInputCommandInteraction, SlashCommandBuilder, ButtonInteraction } from 'discord.js';
export declare class NoteCommands {
    private communityNoteService;
    private noteRatingService;
    private messageService;
    private userService;
    private noteDisplayService;
    private sourceHandlingService;
    private verificationMiddleware;
    constructor();
    /**
     * Gets the view-notes slash command definition
     */
    getViewNotesCommand(): SlashCommandBuilder;
    /**
     * Handles the view-notes slash command
     */
    handleViewNotesCommand(interaction: ChatInputCommandInteraction): Promise<void>;
    /**
     * Handles note rating button interactions
     */
    handleNoteRatingButton(interaction: ButtonInteraction): Promise<void>;
    /**
     * Handles viewing note sources
     */
    private handleViewSources;
    /**
     * Creates navigation buttons for multiple notes
     */
    private createNoteNavigationButtons;
}
//# sourceMappingURL=noteCommands.d.ts.map