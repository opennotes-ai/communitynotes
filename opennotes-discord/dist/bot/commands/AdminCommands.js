import { SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandUserOption, SlashCommandChannelOption, SlashCommandStringOption, EmbedBuilder, ChannelType, PermissionFlagsBits, } from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
import { AdminService } from '../../database/services/adminService.js';
import { ServerService } from '../../database/services/serverService.js';
import { UserService } from '../../database/services/userService.js';
export class AdminCommands {
    adminService;
    serverService;
    userService;
    constructor() {
        this.adminService = new AdminService();
        this.serverService = new ServerService();
        this.userService = new UserService();
    }
    static getSlashCommand() {
        return new SlashCommandBuilder()
            .setName('configure')
            .setDescription('Configure Open Notes settings (Admin only)')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('enable')
            .setDescription('Enable Open Notes in a channel')
            .addChannelOption(new SlashCommandChannelOption()
            .setName('channel')
            .setDescription('Channel to enable')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))
            .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('disable')
            .setDescription('Disable Open Notes in a channel')
            .addChannelOption(new SlashCommandChannelOption()
            .setName('channel')
            .setDescription('Channel to disable')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))
            .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('contributor')
            .setDescription('Manage contributor permissions')
            .addStringOption(new SlashCommandStringOption()
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
            .addUserOption(new SlashCommandUserOption()
            .setName('user')
            .setDescription('User to manage')
            .setRequired(true)))
            .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('emergency')
            .setDescription('Emergency system controls')
            .addStringOption(new SlashCommandStringOption()
            .setName('action')
            .setDescription('Emergency action')
            .setRequired(true)
            .addChoices({ name: 'Pause', value: 'pause' }, { name: 'Resume', value: 'resume' }))
            .addStringOption(new SlashCommandStringOption()
            .setName('reason')
            .setDescription('Reason for emergency action')
            .setRequired(false)))
            .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('stats')
            .setDescription('View Open Notes statistics and activity'))
            .addSubcommand(new SlashCommandSubcommandBuilder()
            .setName('moderation')
            .setDescription('View moderation queue'));
    }
    async handleConfigureCommand(interaction) {
        const guildId = interaction.guild?.id;
        const userId = interaction.user.id;
        if (!guildId) {
            await interaction.reply({
                content: '❌ This command can only be used in servers.',
                ephemeral: true,
            });
            return;
        }
        try {
            // Get server from database
            const server = await this.serverService.findByDiscordId(guildId);
            if (!server) {
                await interaction.reply({
                    content: '❌ Open Notes is not set up for this server. Please contact support.',
                    ephemeral: true,
                });
                return;
            }
            // Check admin permissions
            const isAdmin = await this.adminService.isAdmin(server.id, userId);
            if (!isAdmin) {
                await interaction.reply({
                    content: '❌ You need Administrator permissions or a moderator role to use this command.',
                    ephemeral: true,
                });
                return;
            }
            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case 'enable':
                    await this.handleEnableChannel(interaction, server.id, userId);
                    break;
                case 'disable':
                    await this.handleDisableChannel(interaction, server.id, userId);
                    break;
                case 'contributor':
                    await this.handleContributor(interaction, server.id, userId);
                    break;
                case 'emergency':
                    await this.handleEmergency(interaction, server.id, userId);
                    break;
                case 'stats':
                    await this.handleStats(interaction, server.id);
                    break;
                case 'moderation':
                    await this.handleModeration(interaction, server.id);
                    break;
                default:
                    await interaction.reply({
                        content: '❓ Unknown subcommand.',
                        ephemeral: true,
                    });
            }
        }
        catch (error) {
            logger.error('Error handling configure command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true,
            });
        }
    }
    async handleEnableChannel(interaction, serverId, adminId) {
        const channel = interaction.options.getChannel('channel', true);
        try {
            await this.adminService.enableChannel(serverId, channel.id, adminId);
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Channel Enabled')
                .setDescription(`Open Notes are now enabled in ${channel}.`)
                .addFields({
                name: '📝 What this means',
                value: '• Users can now request Open Notes on messages in this channel\n• Contributors can write and rate notes\n• All server settings apply to this channel',
                inline: false,
            })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            logger.error('Error enabling channel:', error);
            await interaction.reply({
                content: '❌ Failed to enable channel. Please try again.',
                ephemeral: true,
            });
        }
    }
    async handleDisableChannel(interaction, serverId, adminId) {
        const channel = interaction.options.getChannel('channel', true);
        try {
            await this.adminService.disableChannel(serverId, channel.id, adminId);
            const embed = new EmbedBuilder()
                .setColor(0xff6600)
                .setTitle('🔒 Channel Disabled')
                .setDescription(`Open Notes are now disabled in ${channel}.`)
                .addFields({
                name: '⚠️ What this means',
                value: '• Users cannot request new Open Notes in this channel\n• Existing notes will remain visible\n• Contributors cannot write new notes for messages in this channel',
                inline: false,
            })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            logger.error('Error disabling channel:', error);
            await interaction.reply({
                content: '❌ Failed to disable channel. Please try again.',
                ephemeral: true,
            });
        }
    }
    async handleContributor(interaction, serverId, adminId) {
        const action = interaction.options.getString('action', true);
        const user = interaction.options.getUser('user', true);
        try {
            if (action === 'add') {
                // For simplicity, we'll use a default contributor role ID
                // In a real implementation, you might want to configure this per server
                const contributorRoleId = 'contributor';
                await this.adminService.addContributor(serverId, user.id, contributorRoleId, adminId);
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ Contributor Added')
                    .setDescription(`${user} has been granted contributor permissions.`)
                    .addFields({
                    name: '🎯 Contributor Privileges',
                    value: '• Can write Open Notes\n• Can rate other notes\n• Higher trust level in the system\n• May receive priority notifications',
                    inline: false,
                })
                    .setTimestamp();
                await interaction.reply({ embeds: [embed] });
            }
            else if (action === 'remove') {
                await this.adminService.removeContributor(serverId, user.id, adminId);
                const embed = new EmbedBuilder()
                    .setColor(0xff6600)
                    .setTitle('🔒 Contributor Removed')
                    .setDescription(`${user} no longer has contributor permissions.`)
                    .addFields({
                    name: '⚠️ What changed',
                    value: '• Cannot write new Open Notes\n• Can still rate existing notes\n• Returns to standard user permissions',
                    inline: false,
                })
                    .setTimestamp();
                await interaction.reply({ embeds: [embed] });
            }
        }
        catch (error) {
            logger.error('Error managing contributor:', error);
            await interaction.reply({
                content: '❌ Failed to manage contributor permissions. Please try again.',
                ephemeral: true,
            });
        }
    }
    async handleEmergency(interaction, serverId, adminId) {
        const action = interaction.options.getString('action', true);
        const reason = interaction.options.getString('reason');
        try {
            if (action === 'pause') {
                await this.adminService.pauseSystem(serverId, adminId, reason);
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('🚨 System Paused')
                    .setDescription('Open Notes system has been emergency paused.')
                    .addFields({
                    name: '⏸️ What this means',
                    value: '• All Open Notes functionality is disabled\n• No new requests or notes can be created\n• Existing notes remain visible but cannot be rated\n• Only administrators can resume the system',
                    inline: false,
                }, ...(reason ? [{
                        name: '📝 Reason',
                        value: reason,
                        inline: false,
                    }] : []))
                    .setTimestamp();
                await interaction.reply({ embeds: [embed] });
            }
            else if (action === 'resume') {
                await this.adminService.resumeSystem(serverId, adminId);
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('▶️ System Resumed')
                    .setDescription('Open Notes system has been resumed.')
                    .addFields({
                    name: '✅ System Status',
                    value: '• All Open Notes functionality is now active\n• Users can request notes on messages\n• Contributors can write and rate notes\n• Normal operations have resumed',
                    inline: false,
                })
                    .setTimestamp();
                await interaction.reply({ embeds: [embed] });
            }
        }
        catch (error) {
            logger.error('Error handling emergency action:', error);
            await interaction.reply({
                content: '❌ Failed to perform emergency action. Please try again.',
                ephemeral: true,
            });
        }
    }
    async handleStats(interaction, serverId) {
        try {
            await interaction.deferReply();
            const stats = await this.adminService.getAdminStats(serverId);
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('📊 Open Notes Statistics')
                .addFields({
                name: '📈 Overview',
                value: `**${stats.totalRequests}** Total Requests\n**${stats.totalNotes}** Open Notes\n**${stats.pendingModeration}** Pending Moderation`,
                inline: true,
            }, {
                name: '👥 Top Contributors',
                value: stats.topContributors.slice(0, 5).map((contributor, index) => `${index + 1}. ${contributor.username} (${contributor.helpfulnessScore.toFixed(1)} score)`).join('\n') || 'No contributors yet',
                inline: true,
            }, {
                name: '📱 Most Active Channels',
                value: stats.channelActivity.slice(0, 5).map((channel, index) => `${index + 1}. <#${channel.channelId}> (${channel._count.id} messages)`).join('\n') || 'No activity yet',
                inline: false,
            })
                .setTimestamp();
            if (stats.recentActions.length > 0) {
                embed.addFields({
                    name: '🔄 Recent Admin Actions',
                    value: stats.recentActions.slice(0, 5).map(action => `• ${action.action.replace('_', ' ')} - <t:${Math.floor(action.timestamp.getTime() / 1000)}:R>`).join('\n'),
                    inline: false,
                });
            }
            await interaction.editReply({ embeds: [embed] });
        }
        catch (error) {
            logger.error('Error getting stats:', error);
            await interaction.editReply({
                content: '❌ Failed to retrieve statistics. Please try again.',
            });
        }
    }
    async handleModeration(interaction, serverId) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const queue = await this.adminService.getModerationQueue(serverId, 'pending');
            if (queue.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('✅ Moderation Queue')
                    .setDescription('No items pending moderation.')
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            const embed = new EmbedBuilder()
                .setColor(0xff6600)
                .setTitle('⚠️ Moderation Queue')
                .setDescription(`**${queue.length}** items pending review`)
                .addFields(queue.slice(0, 10).map(item => ({
                name: `${item.flagType} - ${item.itemType}`,
                value: `**Reason:** ${item.reason || 'No reason provided'}\n**Flagged:** <t:${Math.floor(item.createdAt.getTime() / 1000)}:R>\n**ID:** \`${item.id}\``,
                inline: true,
            })))
                .setTimestamp();
            if (queue.length > 10) {
                embed.setFooter({ text: `Showing 10 of ${queue.length} items. Use the web dashboard for full management.` });
            }
            await interaction.editReply({ embeds: [embed] });
        }
        catch (error) {
            logger.error('Error getting moderation queue:', error);
            await interaction.editReply({
                content: '❌ Failed to retrieve moderation queue. Please try again.',
            });
        }
    }
}
//# sourceMappingURL=AdminCommands.js.map