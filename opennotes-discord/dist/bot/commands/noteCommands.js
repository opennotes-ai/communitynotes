import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, } from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
import { OpenNoteService, NoteRatingService, MessageService, UserService } from '../../database/services/index.js';
import { NoteDisplayService } from '../services/noteDisplayService.js';
import { SourceHandlingService } from '../services/sourceHandlingService.js';
import { VerificationMiddleware } from '../../verification/VerificationMiddleware.js';
import { VerificationService } from '../../verification/VerificationService.js';
export class NoteCommands {
    communityNoteService;
    noteRatingService;
    messageService;
    userService;
    noteDisplayService;
    sourceHandlingService;
    verificationMiddleware;
    constructor() {
        this.communityNoteService = new OpenNoteService();
        this.noteRatingService = new NoteRatingService();
        this.messageService = new MessageService();
        this.userService = new UserService();
        this.noteDisplayService = new NoteDisplayService();
        this.sourceHandlingService = new SourceHandlingService();
        this.verificationMiddleware = new VerificationMiddleware(new VerificationService());
    }
    /**
     * Gets the view-notes slash command definition
     */
    getViewNotesCommand() {
        return new SlashCommandBuilder()
            .setName('view-notes')
            .setDescription('View open notes for a specific message')
            .addStringOption((option) => option
            .setName('message-id')
            .setDescription('The ID of the message to view notes for')
            .setRequired(true));
    }
    /**
     * Handles the view-notes slash command
     */
    async handleViewNotesCommand(interaction) {
        const messageId = interaction.options.getString('message-id', true);
        const userId = interaction.user.id;
        const guildId = interaction.guild?.id;
        if (!guildId) {
            await interaction.reply({
                content: '❌ This command can only be used in servers.',
                ephemeral: true,
            });
            return;
        }
        try {
            await interaction.deferReply({ ephemeral: true });
            // Find message in database
            const message = await this.messageService.findByDiscordId(messageId);
            if (!message) {
                await interaction.editReply({
                    content: '❌ No message found with that ID. Make sure the message has open notes or requests.',
                });
                return;
            }
            // Get notes for the message
            const notes = await this.communityNoteService.getNotesForMessage(message.id);
            if (notes.length === 0) {
                await interaction.editReply({
                    content: '📝 No open notes found for this message.',
                });
                return;
            }
            // Get user for rating display
            let user = await this.userService.findByDiscordId(userId);
            if (!user) {
                user = await this.userService.createUser({
                    discordId: userId,
                    username: interaction.user.username,
                });
            }
            // Create paginated display for multiple notes
            if (notes.length === 1) {
                const note = notes[0];
                const userRating = await this.noteRatingService.getUserRating(note.id, user.id);
                const embed = this.noteDisplayService.createNoteEmbed(note, {
                    showAuthor: true,
                    showSources: true,
                    showRatings: true,
                    viewerId: user.id,
                });
                const ratingButtons = this.noteDisplayService.createRatingButtons(note.id, userRating);
                await interaction.editReply({
                    embeds: [embed],
                    components: [ratingButtons],
                });
            }
            else {
                // Multiple notes - show summary first
                const summaryEmbed = this.noteDisplayService.createNoteSummaryEmbed(notes, message.discordId);
                // Create navigation buttons
                const navigationRow = this.createNoteNavigationButtons(notes, 0);
                await interaction.editReply({
                    embeds: [summaryEmbed],
                    components: [navigationRow],
                });
            }
            logger.info('View notes command executed', {
                userId,
                messageId: message.discordId,
                notesCount: notes.length,
                guildId,
            });
        }
        catch (error) {
            logger.error('Error in view-notes command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId,
                messageId,
                guildId,
            });
            const errorMessage = '❌ An error occurred while fetching notes. Please try again later.';
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            }
            else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
    /**
     * Handles note rating button interactions
     */
    async handleNoteRatingButton(interaction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;
        // Extract action and note ID from custom ID
        const [, action, noteId] = customId.split('_');
        if (!['helpful', 'not', 'sources'].includes(action)) {
            await interaction.reply({
                content: '❌ Invalid button action.',
                ephemeral: true,
            });
            return;
        }
        try {
            // Handle source viewing
            if (action === 'sources') {
                await this.handleViewSources(interaction, noteId);
                return;
            }
            // Handle rating (helpful/not helpful)
            await interaction.deferReply({ ephemeral: true });
            // Check if user is verified (skip verification check for button interactions as they require prior interaction)
            // Note: Button interactions come from users who have already interacted with the system
            // so we can skip verification here for UX reasons
            // Get or create user
            let user = await this.userService.findByDiscordId(userId);
            if (!user) {
                user = await this.userService.createUser({
                    discordId: userId,
                    username: interaction.user.username,
                });
            }
            // Get the note
            const note = await this.communityNoteService.findById(noteId);
            if (!note) {
                await interaction.editReply({
                    content: '❌ Note not found.',
                });
                return;
            }
            // Check if user is trying to rate their own note
            if (note.authorId === user.id) {
                await interaction.editReply({
                    content: '❌ You cannot rate your own community note.',
                });
                return;
            }
            // Determine rating value
            const helpful = action === 'helpful';
            // Create or update rating
            await this.noteRatingService.createRating({
                noteId,
                raterId: user.id,
                helpful,
                weight: 1.0,
            });
            // Recalculate note stats
            await this.communityNoteService.recalculateRatingStats(noteId);
            // Get updated note with ratings
            const updatedNote = await this.communityNoteService.findById(noteId);
            // Trigger notifications for note rating received
            // Note: We'll need to access the bot instance to get notification integration
            // For now, this is a placeholder - the integration will be added when bot structure allows it
            logger.info('Note rating received - notifications would be triggered here', {
                noteId,
                raterId: user.id,
                helpful,
                totalRatings: updatedNote?.totalRatings || 0
            });
            if (!updatedNote) {
                throw new Error('Failed to fetch updated note');
            }
            // Update the original message with new rating counts
            const userRating = await this.noteRatingService.getUserRating(noteId, user.id);
            const embed = this.noteDisplayService.createNoteEmbed(updatedNote, {
                showAuthor: true,
                showSources: true,
                showRatings: true,
                viewerId: user.id,
            });
            const ratingButtons = this.noteDisplayService.createRatingButtons(noteId, userRating);
            // Update the original message
            await interaction.message.edit({
                embeds: [embed],
                components: [ratingButtons],
            });
            // Send confirmation
            const ratingText = helpful ? '👍 helpful' : '👎 not helpful';
            await interaction.editReply({
                content: `✅ You rated this note as **${ratingText}**. Thank you for your feedback!`,
            });
            logger.info('Note rating submitted', {
                noteId,
                raterId: user.id,
                helpful,
                totalRatings: updatedNote.totalRatings,
                helpfulnessRatio: updatedNote.helpfulnessRatio,
            });
        }
        catch (error) {
            logger.error('Error handling note rating', {
                error: error instanceof Error ? error.message : 'Unknown error',
                customId,
                userId,
                noteId,
            });
            const errorMessage = '❌ An error occurred while submitting your rating. Please try again later.';
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            }
            else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
    /**
     * Handles viewing note sources
     */
    async handleViewSources(interaction, noteId) {
        try {
            const note = await this.communityNoteService.findById(noteId);
            if (!note) {
                await interaction.reply({
                    content: '❌ Note not found.',
                    ephemeral: true,
                });
                return;
            }
            if (note.sources.length === 0) {
                await interaction.reply({
                    content: '📋 This note has no sources provided.',
                    ephemeral: true,
                });
                return;
            }
            const embed = this.sourceHandlingService.createSourcePreviewEmbed(note.sources, noteId);
            await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }
        catch (error) {
            logger.error('Error viewing note sources', {
                error: error instanceof Error ? error.message : 'Unknown error',
                noteId,
            });
            await interaction.reply({
                content: '❌ An error occurred while fetching sources.',
                ephemeral: true,
            });
        }
    }
    /**
     * Creates navigation buttons for multiple notes
     */
    createNoteNavigationButtons(notes, currentIndex) {
        const prevButton = new ButtonBuilder()
            .setCustomId(`note_nav_prev_${currentIndex}`)
            .setLabel('Previous')
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentIndex === 0);
        const nextButton = new ButtonBuilder()
            .setCustomId(`note_nav_next_${currentIndex}`)
            .setLabel('Next')
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentIndex >= notes.length - 1);
        const summaryButton = new ButtonBuilder()
            .setCustomId('note_nav_summary')
            .setLabel('Summary')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Primary);
        return new ActionRowBuilder()
            .addComponents(prevButton, summaryButton, nextButton);
    }
}
//# sourceMappingURL=noteCommands.js.map