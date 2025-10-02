import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, } from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
import { VerificationCommands } from '../commands/VerificationCommands.js';
import { AdminCommands } from '../commands/AdminCommands.js';
import { VerificationService } from '../../verification/VerificationService.js';
import { VerificationMiddleware } from '../../verification/VerificationMiddleware.js';
import { UserService, ServerService, MessageService, NoteRequestService, RateLimitingService, } from '../../database/services/index.js';
export class InteractionHandler {
    bot;
    verificationService;
    verificationMiddleware;
    verificationCommands;
    adminCommands;
    userService;
    serverService;
    messageService;
    noteRequestService;
    rateLimitingService;
    constructor(bot) {
        this.bot = bot;
        this.verificationService = new VerificationService();
        this.verificationMiddleware = new VerificationMiddleware(this.verificationService);
        this.verificationCommands = new VerificationCommands(this.verificationService);
        this.adminCommands = new AdminCommands();
        this.userService = new UserService();
        this.serverService = new ServerService();
        this.messageService = new MessageService();
        this.noteRequestService = new NoteRequestService();
        this.rateLimitingService = new RateLimitingService();
    }
    async handleInteraction(interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                await this.handleSlashCommand(interaction);
            }
            else if (interaction.isMessageContextMenuCommand()) {
                await this.handleMessageContextMenu(interaction);
            }
            else if (interaction.isButton()) {
                await this.handleButton(interaction);
            }
            else if (interaction.isStringSelectMenu()) {
                await this.handleSelectMenu(interaction);
            }
            else if (interaction.isModalSubmit()) {
                await this.handleModalSubmit(interaction);
            }
        }
        catch (error) {
            logger.error('Error handling interaction', {
                interactionId: interaction.id,
                type: interaction.type,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            // Send error response if possible
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request. Please try again later.',
                    ephemeral: true,
                });
            }
        }
    }
    async handleSlashCommand(interaction) {
        const { commandName } = interaction;
        logger.info('Slash command executed', {
            commandName,
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
        });
        switch (commandName) {
            case 'status':
                await this.handleStatusCommand(interaction);
                break;
            case 'configure':
                await this.adminCommands.handleConfigureCommand(interaction);
                break;
            case 'verify':
                await this.verificationCommands.handleVerifyCommand(interaction);
                break;
            case 'verify-code':
                await this.verificationCommands.handleVerifyCodeCommand(interaction);
                break;
            case 'verification-status':
                await this.verificationCommands.handleStatusCommand(interaction);
                break;
            case 'view-notes':
                await this.bot.getNoteCommands().handleViewNotesCommand(interaction);
                break;
            case 'write-note':
                await this.bot.getNoteAuthoringCommands().handleWriteNoteCommand(interaction);
                break;
            case 'notifications':
                await this.bot.getNotificationCommands().handleNotificationCommand(interaction);
                break;
            default:
                await interaction.reply({
                    content: '❓ Unknown command.',
                    ephemeral: true,
                });
        }
    }
    async handleMessageContextMenu(interaction) {
        const { commandName, targetMessage } = interaction;
        logger.info('Message context menu used', {
            commandName,
            messageId: targetMessage.id,
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
        });
        switch (commandName) {
            case 'Request Open Note':
                await this.handleNoteRequest(interaction);
                break;
            default:
                await interaction.reply({
                    content: '❓ Unknown context menu action.',
                    ephemeral: true,
                });
        }
    }
    async handleButton(interaction) {
        const customId = interaction.customId;
        logger.info('Button interaction', {
            customId,
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
        });
        // Handle verification buttons
        if (customId.startsWith('verify_')) {
            await this.verificationCommands.handleVerificationButton(interaction);
            return;
        }
        // Handle note authoring buttons
        if (customId.startsWith('write_note_')) {
            await this.bot.getNoteAuthoringCommands().handleNoteAuthoringButton(interaction);
            return;
        }
        if (customId.startsWith('note_submit_') || customId.startsWith('note_edit_') ||
            customId.startsWith('note_cancel_')) {
            await this.bot.getNoteAuthoringCommands().handlePreviewButton(interaction);
            return;
        }
        // Handle note rating buttons
        if (customId.startsWith('note_')) {
            await this.bot.getNoteCommands().handleNoteRatingButton(interaction);
            return;
        }
        // TODO: Handle other button interactions
        // This will be expanded in later tasks
        await interaction.reply({
            content: '🚧 Button interactions are not yet implemented.',
            ephemeral: true,
        });
    }
    async handleSelectMenu(interaction) {
        const customId = interaction.customId;
        logger.info('Select menu interaction', {
            customId,
            values: interaction.values,
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
        });
        // Handle note classification selection
        if (customId.startsWith('note_classification_')) {
            await this.bot.getNoteAuthoringCommands().handleClassificationSelection(interaction);
            return;
        }
        // Handle other select menu interactions
        await interaction.reply({
            content: '🚧 Unknown select menu interaction.',
            ephemeral: true,
        });
    }
    async handleModalSubmit(interaction) {
        const customId = interaction.customId;
        logger.info('Modal submit', {
            customId,
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
        });
        // Handle verification modals
        if (customId.startsWith('verification_modal_')) {
            await this.verificationCommands.handleVerificationModal(interaction);
            return;
        }
        // Handle note request modal submissions
        if (customId.startsWith('note_request_modal_')) {
            await this.handleNoteRequestModal(interaction);
            return;
        }
        // Handle note content modal submissions
        if (customId.startsWith('note_content_modal_')) {
            await this.bot.getNoteAuthoringCommands().handleContentModal(interaction);
            return;
        }
        // Handle other modal submissions
        await interaction.reply({
            content: '🚧 Unknown modal submission.',
            ephemeral: true,
        });
    }
    async handleStatusCommand(interaction) {
        const status = this.bot.getStatus();
        const embed = {
            title: '🤖 Open Notes Bot Status',
            color: 0x00ff00,
            fields: [
                { name: 'Status', value: status.ready ? '✅ Online' : '❌ Offline', inline: true },
                { name: 'Servers', value: status.guilds.toString(), inline: true },
                { name: 'Users', value: status.users.toString(), inline: true },
                { name: 'Ping', value: `${status.ping}ms`, inline: true },
                { name: 'Uptime', value: this.formatUptime(status.uptime), inline: true },
            ],
            timestamp: new Date().toISOString(),
        };
        await interaction.reply({ embeds: [embed] });
    }
    async handleNoteRequest(interaction) {
        const targetMessage = interaction.targetMessage;
        const guildId = interaction.guild?.id;
        const userId = interaction.user.id;
        if (!guildId) {
            await interaction.reply({
                content: '❌ Open Notes can only be requested in servers.',
                ephemeral: true,
            });
            return;
        }
        try {
            // Check if user is trying to request a note on their own message
            if (targetMessage.author.id === userId) {
                await interaction.reply({
                    content: '❌ You cannot request an Open Note on your own message.',
                    ephemeral: true,
                });
                return;
            }
            // Check if user is trying to request a note on a bot message
            if (targetMessage.author.bot) {
                await interaction.reply({
                    content: '❌ You cannot request an Open Note on a bot message.',
                    ephemeral: true,
                });
                return;
            }
            // Check if user is verified
            const isVerified = await this.verificationMiddleware.requireVerificationForInteraction(interaction);
            if (!isVerified) {
                return; // Error message already sent by middleware
            }
            // Check if server and channel allow open notes
            const server = await this.serverService.findByDiscordId(guildId);
            if (!server) {
                await interaction.reply({
                    content: '❌ Open Notes are not configured for this server.',
                    ephemeral: true,
                });
                return;
            }
            const isChannelEnabled = await this.serverService.isChannelEnabled(server.id, targetMessage.channel.id);
            if (!isChannelEnabled) {
                await interaction.reply({
                    content: '❌ Open Notes are not enabled in this channel.',
                    ephemeral: true,
                });
                return;
            }
            // Get or create user in database
            let user = await this.userService.findByDiscordId(userId);
            if (!user) {
                user = await this.userService.createUser({
                    discordId: userId,
                    username: interaction.user.username,
                });
            }
            // User should never be null at this point, but TypeScript requires the check
            if (!user) {
                await interaction.reply({
                    content: '❌ Failed to create or find user record. Please try again.',
                    ephemeral: true,
                });
                return;
            }
            // Check rate limiting
            const rateLimitCheck = await this.rateLimitingService.checkDailyRequestLimit(user.id);
            if (!rateLimitCheck.allowed) {
                const resetTime = Math.floor(rateLimitCheck.resetAt.getTime() / 1000);
                await interaction.reply({
                    content: `⏳ **Rate Limit Reached**\n\nYou've used all ${rateLimitCheck.maxCount} of your daily Open Note requests.\n\nYour limit will reset <t:${resetTime}:R>.`,
                    ephemeral: true,
                });
                return;
            }
            // Check if user already requested a note for this message
            const existingRequests = await this.noteRequestService.getRequestsForMessage(targetMessage.id);
            const userExistingRequest = existingRequests.find(req => req.requestorId === user.id);
            if (userExistingRequest) {
                await interaction.reply({
                    content: '❌ You have already requested an Open Note for this message.',
                    ephemeral: true,
                });
                return;
            }
            // Show modal for request details
            await this.showNoteRequestModal(interaction, targetMessage.id);
            logger.info('Note request modal shown', {
                requestorId: userId,
                messageId: targetMessage.id,
                messageAuthorId: targetMessage.author.id,
                channelId: targetMessage.channel.id,
                guildId,
            });
        }
        catch (error) {
            logger.error('Error handling note request', {
                error: error instanceof Error ? error.message : 'Unknown error',
                requestorId: userId,
                messageId: targetMessage.id,
                guildId,
            });
            await interaction.reply({
                content: '❌ An error occurred while processing your request. Please try again later.',
                ephemeral: true,
            });
        }
    }
    async showNoteRequestModal(interaction, messageId) {
        const modal = new ModalBuilder()
            .setCustomId(`note_request_modal_${messageId}`)
            .setTitle('Request Open Note');
        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Why does this message need an Open Note?')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('E.g., Contains misleading information, lacks context, needs fact-checking...')
            .setRequired(true)
            .setMaxLength(500);
        const sourcesInput = new TextInputBuilder()
            .setCustomId('sources')
            .setLabel('Supporting Sources (Optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Provide URLs or references that support your request (one per line)')
            .setRequired(false)
            .setMaxLength(1000);
        const actionRow1 = new ActionRowBuilder().addComponents(reasonInput);
        const actionRow2 = new ActionRowBuilder().addComponents(sourcesInput);
        modal.addComponents(actionRow1, actionRow2);
        await interaction.showModal(modal);
    }
    async handleNoteRequestModal(interaction) {
        const messageId = interaction.customId.replace('note_request_modal_', '');
        const reason = interaction.fields.getTextInputValue('reason');
        const sourcesText = interaction.fields.getTextInputValue('sources');
        const userId = interaction.user.id;
        const guildId = interaction.guild?.id;
        if (!guildId) {
            await interaction.reply({
                content: '❌ Open Notes can only be requested in servers.',
                ephemeral: true,
            });
            return;
        }
        try {
            // Get user from database
            const user = await this.userService.findByDiscordId(userId);
            if (!user) {
                await interaction.reply({
                    content: '❌ User not found. Please try the request again.',
                    ephemeral: true,
                });
                return;
            }
            // Parse sources (split by newlines and filter empty lines)
            const sources = sourcesText
                .split('\n')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            // Create or get message in database
            let message = await this.messageService.findByDiscordId(messageId);
            if (!message) {
                // We need to create the message record
                const targetMessage = await interaction.channel?.messages.fetch(messageId);
                if (!targetMessage) {
                    await interaction.reply({
                        content: '❌ Could not find the target message.',
                        ephemeral: true,
                    });
                    return;
                }
                const server = await this.serverService.findByDiscordId(guildId);
                if (!server) {
                    await interaction.reply({
                        content: '❌ Server configuration not found.',
                        ephemeral: true,
                    });
                    return;
                }
                message = await this.messageService.createMessage({
                    messageId: targetMessage.id,
                    channelId: targetMessage.channel.id,
                    serverId: guildId,
                    authorId: targetMessage.author.id,
                    content: targetMessage.content,
                    attachments: targetMessage.attachments.map(a => a.url),
                    timestamp: targetMessage.createdAt,
                });
            }
            // Create the note request
            const request = await this.noteRequestService.createRequest({
                messageId: message.id,
                requestorId: user.id,
                serverId: server.id,
                reason,
                sources,
            });
            // Increment rate limiting
            await this.rateLimitingService.incrementDailyRequestCount(user.id);
            // Update message request stats
            await this.messageService.updateRequestStats(message.id);
            // Check if threshold is met and trigger notifications
            const aggregation = await this.bot.getNotificationIntegration();
            if (aggregation) {
                await aggregation.handleNewRequestThresholdMet(message.id);
            }
            // Get updated stats for response
            const stats = await this.noteRequestService.getRequestCountForMessage(message.id);
            const rateLimitStatus = await this.rateLimitingService.checkDailyRequestLimit(user.id);
            // Create success embed
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Open Note Request Submitted')
                .setDescription(`Your request has been recorded and will be reviewed by the community.`)
                .addFields({
                name: '📝 Your Reason',
                value: reason.length > 100 ? reason.substring(0, 100) + '...' : reason,
                inline: false,
            }, {
                name: '📊 Request Stats',
                value: `**${stats.total}** total requests\n**${stats.unique}** unique requestors`,
                inline: true,
            }, {
                name: '⏱️ Your Daily Usage',
                value: `**${rateLimitStatus.currentCount}**/${rateLimitStatus.maxCount} requests used`,
                inline: true,
            })
                .setTimestamp();
            if (sources.length > 0) {
                embed.addFields({
                    name: '🔗 Sources Provided',
                    value: sources.slice(0, 3).join('\n') + (sources.length > 3 ? `\n...and ${sources.length - 3} more` : ''),
                    inline: false,
                });
            }
            await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
            logger.info('Open Note request created successfully', {
                requestId: request.id,
                requestorId: userId,
                messageId: message.id,
                reason: reason.substring(0, 100),
                sourcesCount: sources.length,
                totalRequests: stats.total,
                uniqueRequestors: stats.unique,
                guildId,
            });
        }
        catch (error) {
            logger.error('Error creating note request', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                requestorId: userId,
                messageId,
                guildId,
            });
            const errorMessage = error instanceof Error && error.message.includes('already requested')
                ? '❌ You have already requested an Open Note for this message.'
                : '❌ An error occurred while submitting your request. Please try again later.';
            await interaction.reply({
                content: errorMessage,
                ephemeral: true,
            });
        }
    }
    formatUptime(uptime) {
        if (!uptime)
            return 'Unknown';
        const seconds = Math.floor(uptime / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days > 0)
            return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0)
            return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
}
//# sourceMappingURL=interactionHandler.js.map