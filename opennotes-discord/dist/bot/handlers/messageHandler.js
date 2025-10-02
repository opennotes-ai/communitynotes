import { logger } from '../../shared/utils/logger.js';
import { OpenNoteService, MessageService } from '../../database/services/index.js';
import { NoteDisplayService } from '../services/noteDisplayService.js';
export class MessageHandler {
    bot;
    communityNoteService;
    messageService;
    noteDisplayService;
    constructor(bot) {
        this.bot = bot;
        this.communityNoteService = new OpenNoteService();
        this.messageService = new MessageService();
        this.noteDisplayService = new NoteDisplayService();
    }
    async handleMessage(message) {
        try {
            // Ignore bot messages
            if (message.author.bot)
                return;
            // Ignore DMs for now (will handle in later tasks)
            if (!message.guild)
                return;
            // Log message for monitoring
            logger.debug('Message received', {
                messageId: message.id,
                channelId: message.channel.id,
                serverId: message.guild.id,
                authorId: message.author.id,
                contentLength: message.content.length,
            });
            // TODO: Check if server/channel is configured for Open Notes
            // This will be implemented in task-4 when we have database
            // Create message context for future processing
            const messageContext = {
                messageId: message.id,
                channelId: message.channel.id,
                serverId: message.guild.id,
                authorId: message.author.id,
                content: message.content,
                timestamp: message.createdAt,
                attachments: message.attachments.map(attachment => attachment.url),
            };
            // TODO: Store message in database for potential note requests
            // This will be implemented in task-4
            // Check for existing open notes on this message
            await this.checkAndDisplayNotes(message);
            // Handle basic bot commands (temporary, will be replaced with slash commands)
            if (message.content.startsWith('!cn')) {
                await this.handleLegacyCommand(message);
            }
        }
        catch (error) {
            logger.error('Error handling message', {
                messageId: message.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async handleLegacyCommand(message) {
        const args = message.content.slice(3).trim().split(' ');
        const command = args[0]?.toLowerCase();
        switch (command) {
            case 'status':
                await this.handleStatusCommand(message);
                break;
            case 'help':
                await this.handleHelpCommand(message);
                break;
            default:
                await message.reply('❓ Unknown command. Use `!cn help` for available commands.');
        }
    }
    async handleStatusCommand(message) {
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
        await message.reply({ embeds: [embed] });
    }
    async handleHelpCommand(message) {
        const embed = {
            title: '📋 Open Notes Bot Help',
            description: 'This bot enables Open Notes functionality for Discord messages.',
            color: 0x0099ff,
            fields: [
                {
                    name: '🎯 How to Request a Note',
                    value: 'Right-click on a message → Apps → Request Open Note',
                },
                {
                    name: '✍️ How to Write a Note',
                    value: 'Contributors can view and respond to requests via the dashboard',
                },
                {
                    name: '⚙️ Commands',
                    value: '`!cn status` - Check bot status\n`!cn help` - Show this help',
                },
                {
                    name: '🔗 Links',
                    value: '[Open Notes Guide](https://communitynotes.x.com/guide)\n[Bot Dashboard](#) (Coming soon)',
                },
            ],
            footer: {
                text: 'Open Notes Discord Bot',
            },
            timestamp: new Date().toISOString(),
        };
        await message.reply({ embeds: [embed] });
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
    /**
     * Checks for existing open notes and displays them if they meet auto-display criteria
     */
    async checkAndDisplayNotes(message) {
        try {
            // Find message in database
            const dbMessage = await this.messageService.findByDiscordId(message.id);
            if (!dbMessage) {
                // Message not in database yet, nothing to display
                return;
            }
            // Get notes for the message
            const notes = await this.communityNoteService.getNotesForMessage(dbMessage.id, true); // Only visible notes
            if (notes.length === 0) {
                return;
            }
            // Find notes that should be auto-displayed
            const autoDisplayNotes = notes.filter(note => this.noteDisplayService.shouldAutoDisplayNote(note));
            if (autoDisplayNotes.length === 0) {
                return;
            }
            // Display the highest confidence note as a reply
            const topNote = autoDisplayNotes[0]; // Already sorted by confidence in the service
            const summary = this.noteDisplayService.createAutoDisplaySummary(topNote);
            // Reply to the original message with the note
            await message.reply({
                content: summary,
                allowedMentions: { repliedUser: false }, // Don't ping the original author
            });
            logger.info('Auto-displayed open note', {
                messageId: message.id,
                noteId: topNote.id,
                confidence: topNote.helpfulnessRatio,
                ratings: topNote.totalRatings,
                channelId: message.channel.id,
                guildId: message.guild?.id,
            });
        }
        catch (error) {
            logger.error('Error checking for open notes', {
                error: error instanceof Error ? error.message : 'Unknown error',
                messageId: message.id,
                channelId: message.channel.id,
                guildId: message.guild?.id,
            });
            // Don't throw - we don't want to break message processing for this
        }
    }
}
//# sourceMappingURL=messageHandler.js.map