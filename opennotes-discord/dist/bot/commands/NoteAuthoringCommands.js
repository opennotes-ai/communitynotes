import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
import { VerificationMiddleware } from '../../verification/VerificationMiddleware.js';
import { UserService, MessageService, OpenNoteService, NoteRequestService, RateLimitingService } from '../../database/services/index.js';
export class NoteAuthoringCommands {
    verificationService;
    verificationMiddleware;
    userService;
    messageService;
    communityNoteService;
    noteRequestService;
    rateLimitingService;
    // In-memory draft storage (in production, this should be in Redis or database)
    drafts = new Map();
    constructor(verificationService) {
        this.verificationService = verificationService;
        this.verificationMiddleware = new VerificationMiddleware(verificationService);
        this.userService = new UserService();
        this.messageService = new MessageService();
        this.communityNoteService = new OpenNoteService();
        this.noteRequestService = new NoteRequestService();
        this.rateLimitingService = new RateLimitingService();
    }
    getWriteNoteCommand() {
        return new SlashCommandBuilder()
            .setName('write-note')
            .setDescription('Write an Open Note for a message')
            .addStringOption(option => option
            .setName('message-link')
            .setDescription('Discord message link or message ID')
            .setRequired(true));
    }
    async handleWriteNoteCommand(interaction) {
        try {
            // Check verification
            const isVerified = await this.verificationMiddleware.requireVerificationForInteraction(interaction);
            if (!isVerified) {
                return; // Error message already sent by middleware
            }
            // Check permissions
            const permissions = await this.verificationService.getUserPermissions(interaction.user.id);
            if (!permissions.canCreateNotes) {
                await interaction.reply({
                    content: '❌ You do not have permission to write Open Notes. Please complete the contributor verification process.',
                    ephemeral: true
                });
                return;
            }
            const messageLinkOrId = interaction.options.getString('message-link', true);
            const messageId = this.extractMessageId(messageLinkOrId);
            if (!messageId) {
                await interaction.reply({
                    content: '❌ Invalid message link or ID. Please provide a valid Discord message link or message ID.',
                    ephemeral: true
                });
                return;
            }
            // Get message from Discord
            let targetMessage;
            try {
                targetMessage = await interaction.channel?.messages.fetch(messageId);
            }
            catch (error) {
                await interaction.reply({
                    content: '❌ Could not find the specified message. Make sure the message exists and you have access to it.',
                    ephemeral: true
                });
                return;
            }
            if (!targetMessage) {
                await interaction.reply({
                    content: '❌ Could not find the specified message.',
                    ephemeral: true
                });
                return;
            }
            // Validation checks
            if (targetMessage.author.id === interaction.user.id) {
                await interaction.reply({
                    content: '❌ You cannot write an Open Note for your own message.',
                    ephemeral: true
                });
                return;
            }
            if (targetMessage.author.bot) {
                await interaction.reply({
                    content: '❌ You cannot write an Open Note for a bot message.',
                    ephemeral: true
                });
                return;
            }
            // Check if message has note requests
            const message = await this.messageService.findByDiscordId(messageId);
            if (!message) {
                await interaction.reply({
                    content: '❌ This message has not been flagged for Open Notes. Messages need to be reported first before notes can be written.',
                    ephemeral: true
                });
                return;
            }
            const requestCount = await this.noteRequestService.getRequestCountForMessage(message.id);
            if (requestCount.total === 0) {
                await interaction.reply({
                    content: '❌ This message has not been flagged for Open Notes. Messages need to be reported first before notes can be written.',
                    ephemeral: true
                });
                return;
            }
            // Check if user already has a note for this message
            const existingNotes = await this.communityNoteService.getNotesForMessage(message.id);
            const userExistingNote = existingNotes.find(note => note.authorId === interaction.user.id);
            if (userExistingNote) {
                await interaction.reply({
                    content: '❌ You have already written an Open Note for this message.',
                    ephemeral: true
                });
                return;
            }
            // Check rate limiting for note creation
            const user = await this.userService.findByDiscordId(interaction.user.id);
            if (!user) {
                await interaction.reply({
                    content: '❌ User record not found. Please try again.',
                    ephemeral: true
                });
                return;
            }
            // Show note authoring interface
            await this.showNoteAuthoringInterface(interaction, targetMessage, message, requestCount);
        }
        catch (error) {
            logger.error('Error handling write-note command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: interaction.user.id,
                guildId: interaction.guild?.id
            });
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request. Please try again later.',
                    ephemeral: true
                });
            }
        }
    }
    async showNoteAuthoringInterface(interaction, targetMessage, message, requestCount) {
        // Check for existing draft
        const draftKey = `${interaction.user.id}-${message.id}`;
        const existingDraft = this.drafts.get(draftKey);
        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('📝 Write an Open Note')
            .setDescription(`You're writing a note for this message:`)
            .addFields({
            name: '💬 Original Message',
            value: targetMessage.content.length > 500
                ? targetMessage.content.substring(0, 500) + '...'
                : targetMessage.content,
            inline: false
        }, {
            name: '📊 Request Information',
            value: `**${requestCount.total}** total requests from **${requestCount.unique}** unique users`,
            inline: false
        })
            .setTimestamp();
        if (existingDraft) {
            embed.addFields({
                name: '💾 Draft Found',
                value: 'You have a saved draft for this message. You can continue editing or start fresh.',
                inline: false
            });
        }
        const buttons = new ActionRowBuilder()
            .addComponents(new ButtonBuilder()
            .setCustomId(`write_note_new_${message.id}`)
            .setLabel('✏️ Write New Note')
            .setStyle(ButtonStyle.Primary), existingDraft ? new ButtonBuilder()
            .setCustomId(`write_note_draft_${message.id}`)
            .setLabel('📝 Continue Draft')
            .setStyle(ButtonStyle.Secondary) : null).components.filter(Boolean);
        await interaction.reply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(buttons)],
            ephemeral: true
        });
    }
    async handleNoteAuthoringButton(interaction) {
        const customId = interaction.customId;
        const messageId = customId.split('_').pop();
        const action = customId.includes('_draft_') ? 'draft' : 'new';
        if (action === 'new') {
            await this.showClassificationSelector(interaction, messageId);
        }
        else if (action === 'draft') {
            await this.showDraftEditModal(interaction, messageId);
        }
    }
    async showClassificationSelector(interaction, messageId) {
        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('🏷️ Step 1: Choose Note Classification')
            .setDescription('Select the type of Open Note you want to write:')
            .addFields({
            name: '🚨 Misleading',
            value: 'The message contains false or misleading information',
            inline: false
        }, {
            name: '❓ Lacking Context',
            value: 'The message is missing important context or background information',
            inline: false
        }, {
            name: '⚠️ Disputed',
            value: 'The claims in the message are disputed or controversial',
            inline: false
        }, {
            name: '📝 Unsubstantiated',
            value: 'The message makes claims without sufficient evidence or sources',
            inline: false
        });
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`note_classification_${messageId}`)
            .setPlaceholder('Choose a classification...')
            .addOptions(new StringSelectMenuOptionBuilder()
            .setLabel('Misleading')
            .setDescription('Contains false or misleading information')
            .setValue('misleading')
            .setEmoji('🚨'), new StringSelectMenuOptionBuilder()
            .setLabel('Lacking Context')
            .setDescription('Missing important context or background')
            .setValue('lacking-context')
            .setEmoji('❓'), new StringSelectMenuOptionBuilder()
            .setLabel('Disputed')
            .setDescription('Claims are disputed or controversial')
            .setValue('disputed')
            .setEmoji('⚠️'), new StringSelectMenuOptionBuilder()
            .setLabel('Unsubstantiated')
            .setDescription('Claims lack sufficient evidence')
            .setValue('unsubstantiated')
            .setEmoji('📝'));
        await interaction.update({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(selectMenu)]
        });
    }
    async handleClassificationSelection(interaction) {
        const messageId = interaction.customId.split('_').pop();
        const classification = interaction.values[0];
        // Store classification in draft
        const draftKey = `${interaction.user.id}-${messageId}`;
        let draft = this.drafts.get(draftKey) || {
            userId: interaction.user.id,
            messageId: messageId,
            content: '',
            classification: '',
            sources: [],
            timestamp: new Date()
        };
        draft.classification = classification;
        draft.timestamp = new Date();
        this.drafts.set(draftKey, draft);
        // Show content modal
        await this.showContentModal(interaction, messageId, classification);
    }
    async showContentModal(interaction, messageId, classification) {
        const modal = new ModalBuilder()
            .setCustomId(`note_content_modal_${messageId}`)
            .setTitle(`Open Note: ${this.getClassificationLabel(classification)}`);
        const contentInput = new TextInputBuilder()
            .setCustomId('content')
            .setLabel('Note Content')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Write your Open Note here. Be factual, neutral, and provide helpful context...')
            .setRequired(true)
            .setMinLength(50)
            .setMaxLength(1500);
        const sourcesInput = new TextInputBuilder()
            .setCustomId('sources')
            .setLabel('Sources and References')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Provide URLs, links, or references that support your note (one per line)')
            .setRequired(false)
            .setMaxLength(2000);
        const actionRow1 = new ActionRowBuilder().addComponents(contentInput);
        const actionRow2 = new ActionRowBuilder().addComponents(sourcesInput);
        modal.addComponents(actionRow1, actionRow2);
        await interaction.showModal(modal);
    }
    async showDraftEditModal(interaction, messageId) {
        const draftKey = `${interaction.user.id}-${messageId}`;
        const draft = this.drafts.get(draftKey);
        if (!draft) {
            await interaction.update({
                content: '❌ Draft not found. Please start a new note.',
                embeds: [],
                components: []
            });
            return;
        }
        const modal = new ModalBuilder()
            .setCustomId(`note_content_modal_${messageId}`)
            .setTitle(`Edit Draft: ${this.getClassificationLabel(draft.classification)}`);
        const contentInput = new TextInputBuilder()
            .setCustomId('content')
            .setLabel('Note Content')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Write your Open Note here...')
            .setValue(draft.content)
            .setRequired(true)
            .setMinLength(50)
            .setMaxLength(1500);
        const sourcesInput = new TextInputBuilder()
            .setCustomId('sources')
            .setLabel('Sources and References')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Provide URLs, links, or references (one per line)')
            .setValue(draft.sources.join('\n'))
            .setRequired(false)
            .setMaxLength(2000);
        const actionRow1 = new ActionRowBuilder().addComponents(contentInput);
        const actionRow2 = new ActionRowBuilder().addComponents(sourcesInput);
        modal.addComponents(actionRow1, actionRow2);
        await interaction.showModal(modal);
    }
    async handleContentModal(interaction) {
        const messageId = interaction.customId.replace('note_content_modal_', '');
        const content = interaction.fields.getTextInputValue('content');
        const sourcesText = interaction.fields.getTextInputValue('sources');
        // Parse sources
        const sources = sourcesText
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        // Update draft
        const draftKey = `${interaction.user.id}-${messageId}`;
        let draft = this.drafts.get(draftKey);
        if (!draft) {
            await interaction.reply({
                content: '❌ Draft not found. Please restart the note creation process.',
                ephemeral: true
            });
            return;
        }
        draft.content = content;
        draft.sources = sources;
        draft.timestamp = new Date();
        this.drafts.set(draftKey, draft);
        // Show preview
        await this.showNotePreview(interaction, messageId, draft);
    }
    async showNotePreview(interaction, messageId, draft) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('📋 Open Note Preview')
            .setDescription('Review your note before submitting:')
            .addFields({
            name: '🏷️ Classification',
            value: this.getClassificationLabel(draft.classification),
            inline: true
        }, {
            name: '📝 Content',
            value: draft.content.length > 1000 ? draft.content.substring(0, 1000) + '...' : draft.content,
            inline: false
        });
        if (draft.sources.length > 0) {
            embed.addFields({
                name: '🔗 Sources',
                value: draft.sources.slice(0, 5).join('\n') + (draft.sources.length > 5 ? `\n...and ${draft.sources.length - 5} more` : ''),
                inline: false
            });
        }
        embed.addFields({
            name: '📊 Stats',
            value: `**${draft.content.length}**/1500 characters\n**${draft.sources.length}** sources`,
            inline: true
        }, {
            name: '⚠️ Guidelines Reminder',
            value: '• Be factual and neutral\n• Provide helpful context\n• Include reliable sources\n• Follow community standards',
            inline: false
        });
        const buttons = new ActionRowBuilder()
            .addComponents(new ButtonBuilder()
            .setCustomId(`note_submit_${messageId}`)
            .setLabel('✅ Submit Note')
            .setStyle(ButtonStyle.Success), new ButtonBuilder()
            .setCustomId(`note_edit_${messageId}`)
            .setLabel('✏️ Edit Note')
            .setStyle(ButtonStyle.Secondary), new ButtonBuilder()
            .setCustomId(`note_cancel_${messageId}`)
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Danger));
        await interaction.reply({
            embeds: [embed],
            components: [buttons],
            ephemeral: true
        });
    }
    async handlePreviewButton(interaction) {
        const customId = interaction.customId;
        const messageId = customId.split('_').pop();
        const action = customId.includes('_submit_') ? 'submit' :
            customId.includes('_edit_') ? 'edit' : 'cancel';
        switch (action) {
            case 'submit':
                await this.submitNote(interaction, messageId);
                break;
            case 'edit':
                await this.showClassificationSelector(interaction, messageId);
                break;
            case 'cancel':
                // Clear draft
                const draftKey = `${interaction.user.id}-${messageId}`;
                this.drafts.delete(draftKey);
                await interaction.update({
                    content: '❌ Note creation cancelled. Your draft has been deleted.',
                    embeds: [],
                    components: []
                });
                break;
        }
    }
    async submitNote(interaction, messageId) {
        try {
            const draftKey = `${interaction.user.id}-${messageId}`;
            const draft = this.drafts.get(draftKey);
            if (!draft) {
                await interaction.update({
                    content: '❌ Draft not found. Please restart the note creation process.',
                    embeds: [],
                    components: []
                });
                return;
            }
            // Get user and message from database
            const user = await this.userService.findByDiscordId(interaction.user.id);
            const message = await this.messageService.findByDiscordId(messageId);
            if (!user || !message) {
                await interaction.update({
                    content: '❌ Failed to find user or message. Please try again.',
                    embeds: [],
                    components: []
                });
                return;
            }
            // Create the community note
            const note = await this.communityNoteService.createNote({
                messageId: message.id,
                authorId: user.id,
                content: draft.content,
                classification: draft.classification,
                sources: draft.sources
            });
            // Update user stats
            await this.userService.incrementNoteCount(user.id);
            // Clear draft
            this.drafts.delete(draftKey);
            // Trigger notifications (note published and milestone checks)
            // Note: We'll need to access the bot instance to get notification integration
            // For now, this is a placeholder - the integration will be added when bot structure allows it
            logger.info('Note published - notifications would be triggered here', {
                noteId: note.id,
                authorId: user.id,
                messageId: message.id
            });
            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Open Note Submitted')
                .setDescription('Your Open Note has been submitted successfully!')
                .addFields({
                name: '📝 Note ID',
                value: note.id,
                inline: true
            }, {
                name: '📊 Status',
                value: 'Pending Review',
                inline: true
            }, {
                name: '🔄 Next Steps',
                value: 'Your note will be reviewed by the community. You can track its status in the dashboard.',
                inline: false
            })
                .setTimestamp();
            await interaction.update({
                content: null,
                embeds: [successEmbed],
                components: []
            });
            logger.info('Open Note submitted successfully', {
                noteId: note.id,
                authorId: user.id,
                messageId: message.id,
                classification: draft.classification,
                contentLength: draft.content.length,
                sourcesCount: draft.sources.length
            });
        }
        catch (error) {
            logger.error('Error submitting community note', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: interaction.user.id,
                messageId
            });
            await interaction.update({
                content: '❌ An error occurred while submitting your note. Please try again later.',
                embeds: [],
                components: []
            });
        }
    }
    extractMessageId(input) {
        // Extract message ID from Discord message link or return the input if it's already an ID
        const linkPattern = /https:\/\/discord\.com\/channels\/\d+\/\d+\/(\d+)/;
        const match = input.match(linkPattern);
        if (match) {
            return match[1];
        }
        // Check if input is a valid Discord snowflake (message ID)
        if (/^\d{17,19}$/.test(input)) {
            return input;
        }
        return null;
    }
    getClassificationLabel(classification) {
        const labels = {
            'misleading': '🚨 Misleading',
            'lacking-context': '❓ Lacking Context',
            'disputed': '⚠️ Disputed',
            'unsubstantiated': '📝 Unsubstantiated'
        };
        return labels[classification] || classification;
    }
    // Clean up old drafts (should be called periodically)
    cleanupOldDrafts() {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
        const keysToDelete = [];
        this.drafts.forEach((draft, key) => {
            if (draft.timestamp < cutoff) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.drafts.delete(key));
    }
}
//# sourceMappingURL=NoteAuthoringCommands.js.map