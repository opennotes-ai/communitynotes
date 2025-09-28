import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType
} from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
import { NotificationService } from '../../notifications/NotificationService.js';
import { UserService } from '../../database/services/userService.js';
import { NotificationMethod } from '../../notifications/types.js';

export class NotificationCommands {
  constructor(
    private notificationService: NotificationService,
    private userService: UserService
  ) {}

  getNotificationSettingsCommand() {
    return new SlashCommandBuilder()
      .setName('notifications')
      .setDescription('Manage your notification preferences')
      .addSubcommand(subcommand =>
        subcommand
          .setName('settings')
          .setDescription('View and update your notification settings')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('mute')
          .setDescription('Temporarily mute all notifications')
          .addIntegerOption(option =>
            option
              .setName('duration')
              .setDescription('Duration in hours (default: 24)')
              .setMinValue(1)
              .setMaxValue(168) // 1 week
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('unmute')
          .setDescription('Unmute notifications')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('test')
          .setDescription('Send a test notification')
      );
  }

  async handleNotificationCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    try {
      // Find or create user
      const user = await this.userService.findByDiscordId(interaction.user.id);
      if (!user) {
        await interaction.reply({
          content: '❌ You need to verify your account first. Use `/verify` to get started.',
          ephemeral: true
        });
        return;
      }

      switch (subcommand) {
        case 'settings':
          await this.handleSettingsCommand(interaction, user.id);
          break;
        case 'mute':
          await this.handleMuteCommand(interaction, user.id);
          break;
        case 'unmute':
          await this.handleUnmuteCommand(interaction, user.id);
          break;
        case 'test':
          await this.handleTestCommand(interaction, user.id);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown subcommand',
            ephemeral: true
          });
      }
    } catch (error) {
      logger.error('Error handling notification command', {
        subcommand,
        userId: interaction.user.id,
        error: error instanceof Error ? error.message : String(error)
      });

      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }

  private async handleSettingsCommand(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
    const preferences = await this.notificationService.getUserPreferences(userId);
    if (!preferences) {
      await interaction.reply({
        content: '❌ Failed to load your notification preferences.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔔 Notification Settings')
      .setDescription('Configure when and how you receive notifications')
      .setColor(0x3498db)
      .addFields(
        {
          name: '📝 New Requests',
          value: preferences.newRequestsThreshold ? '✅ Enabled' : '❌ Disabled',
          inline: true
        },
        {
          name: '📄 Note Published',
          value: preferences.notePublishedOnRequest ? '✅ Enabled' : '❌ Disabled',
          inline: true
        },
        {
          name: '⭐ Note Ratings',
          value: preferences.noteReceivedRatings ? '✅ Enabled' : '❌ Disabled',
          inline: true
        },
        {
          name: '🔄 Status Changes',
          value: preferences.noteStatusChanged ? '✅ Enabled' : '❌ Disabled',
          inline: true
        },
        {
          name: '🏆 Milestones',
          value: preferences.contributorMilestones ? '✅ Enabled' : '❌ Disabled',
          inline: true
        },
        {
          name: '📦 Batching',
          value: preferences.batchingEnabled ? `✅ Enabled (${preferences.batchingInterval}min)` : '❌ Disabled',
          inline: true
        },
        {
          name: '📱 Methods',
          value: preferences.methods.join(', ').replace('discord_dm', 'Direct Message').replace('channel_mention', 'Channel Mention'),
          inline: false
        }
      );

    if (preferences.mutedUntil && preferences.mutedUntil > new Date()) {
      embed.addFields({
        name: '🔇 Muted Until',
        value: `<t:${Math.floor(preferences.mutedUntil.getTime() / 1000)}:F>`,
        inline: false
      });
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('notification_toggle_types')
          .setLabel('Toggle Types')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔔'),
        new ButtonBuilder()
          .setCustomId('notification_set_methods')
          .setLabel('Set Methods')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📱'),
        new ButtonBuilder()
          .setCustomId('notification_set_batching')
          .setLabel('Configure Batching')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📦')
      );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });

    // Handle button interactions
    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id,
      time: 5 * 60 * 1000 // 5 minutes
    });

    collector?.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.customId === 'notification_toggle_types') {
        await this.showNotificationTypeToggle(buttonInteraction, userId);
      } else if (buttonInteraction.customId === 'notification_set_methods') {
        await this.showMethodSelection(buttonInteraction, userId);
      } else if (buttonInteraction.customId === 'notification_set_batching') {
        await this.showBatchingConfig(buttonInteraction, userId);
      }
    });
  }

  private async showNotificationTypeToggle(interaction: any, userId: string): Promise<void> {
    const preferences = await this.notificationService.getUserPreferences(userId);
    if (!preferences) return;

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('toggle_notification_types')
      .setPlaceholder('Select notification types to toggle')
      .setMinValues(0)
      .setMaxValues(5)
      .addOptions(
        {
          label: 'New Requests',
          description: 'When messages reach the request threshold',
          value: 'new_requests',
          default: preferences.newRequestsThreshold
        },
        {
          label: 'Note Published',
          description: 'When your requested notes are published',
          value: 'note_published',
          default: preferences.notePublishedOnRequest
        },
        {
          label: 'Note Ratings',
          description: 'When your notes receive ratings',
          value: 'note_ratings',
          default: preferences.noteReceivedRatings
        },
        {
          label: 'Status Changes',
          description: 'When your note status changes',
          value: 'status_changed',
          default: preferences.noteStatusChanged
        },
        {
          label: 'Milestones',
          description: 'When you reach contributor milestones',
          value: 'milestones',
          default: preferences.contributorMilestones
        }
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.update({
      content: 'Select which notification types you want to receive:',
      components: [row],
      embeds: []
    });

    const selectCollector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (i: any) => i.user.id === interaction.user.id && i.customId === 'toggle_notification_types',
      time: 2 * 60 * 1000
    });

    selectCollector?.on('collect', async (selectInteraction: any) => {
      const selectedTypes = selectInteraction.values;

      const updates = {
        newRequestsThreshold: selectedTypes.includes('new_requests'),
        notePublishedOnRequest: selectedTypes.includes('note_published'),
        noteReceivedRatings: selectedTypes.includes('note_ratings'),
        noteStatusChanged: selectedTypes.includes('status_changed'),
        contributorMilestones: selectedTypes.includes('milestones')
      };

      const success = await this.notificationService.updateUserPreferences(userId, updates);

      if (success) {
        await selectInteraction.update({
          content: '✅ Notification preferences updated successfully!',
          components: []
        });
      } else {
        await selectInteraction.update({
          content: '❌ Failed to update notification preferences.',
          components: []
        });
      }
    });
  }

  private async showMethodSelection(interaction: any, userId: string): Promise<void> {
    const preferences = await this.notificationService.getUserPreferences(userId);
    if (!preferences) return;

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('set_notification_methods')
      .setPlaceholder('Select notification methods')
      .setMinValues(1)
      .setMaxValues(2)
      .addOptions(
        {
          label: 'Direct Message',
          description: 'Receive notifications via Discord DM',
          value: 'discord_dm',
          default: preferences.methods.includes(NotificationMethod.DISCORD_DM)
        },
        {
          label: 'Channel Mention',
          description: 'Get mentioned in the channel',
          value: 'channel_mention',
          default: preferences.methods.includes(NotificationMethod.CHANNEL_MENTION)
        }
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.update({
      content: 'Select how you want to receive notifications:',
      components: [row],
      embeds: []
    });

    const selectCollector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (i: any) => i.user.id === interaction.user.id && i.customId === 'set_notification_methods',
      time: 2 * 60 * 1000
    });

    selectCollector?.on('collect', async (selectInteraction: any) => {
      const selectedMethods = selectInteraction.values as NotificationMethod[];

      const success = await this.notificationService.updateUserPreferences(userId, {
        methods: selectedMethods
      });

      if (success) {
        await selectInteraction.update({
          content: '✅ Notification methods updated successfully!',
          components: []
        });
      } else {
        await selectInteraction.update({
          content: '❌ Failed to update notification methods.',
          components: []
        });
      }
    });
  }

  private async showBatchingConfig(interaction: any, userId: string): Promise<void> {
    const preferences = await this.notificationService.getUserPreferences(userId);
    if (!preferences) return;

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('set_batching_config')
      .setPlaceholder('Configure notification batching')
      .addOptions(
        {
          label: 'Disable Batching',
          description: 'Send notifications immediately',
          value: 'disabled'
        },
        {
          label: '15 minutes',
          description: 'Batch notifications every 15 minutes',
          value: '15'
        },
        {
          label: '30 minutes',
          description: 'Batch notifications every 30 minutes',
          value: '30'
        },
        {
          label: '1 hour',
          description: 'Batch notifications every hour',
          value: '60'
        },
        {
          label: '2 hours',
          description: 'Batch notifications every 2 hours',
          value: '120'
        }
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.update({
      content: 'Configure notification batching:',
      components: [row],
      embeds: []
    });

    const selectCollector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (i: any) => i.user.id === interaction.user.id && i.customId === 'set_batching_config',
      time: 2 * 60 * 1000
    });

    selectCollector?.on('collect', async (selectInteraction: any) => {
      const selectedValue = selectInteraction.values[0];

      const updates = selectedValue === 'disabled'
        ? { batchingEnabled: false }
        : { batchingEnabled: true, batchingInterval: parseInt(selectedValue) };

      const success = await this.notificationService.updateUserPreferences(userId, updates);

      if (success) {
        await selectInteraction.update({
          content: '✅ Batching configuration updated successfully!',
          components: []
        });
      } else {
        await selectInteraction.update({
          content: '❌ Failed to update batching configuration.',
          components: []
        });
      }
    });
  }

  private async handleMuteCommand(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
    const duration = interaction.options.getInteger('duration') || 24; // Default 24 hours
    const mutedUntil = new Date(Date.now() + duration * 60 * 60 * 1000);

    const success = await this.notificationService.updateUserPreferences(userId, { mutedUntil });

    if (success) {
      await interaction.reply({
        content: `🔇 Notifications muted until <t:${Math.floor(mutedUntil.getTime() / 1000)}:F>`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Failed to mute notifications.',
        ephemeral: true
      });
    }
  }

  private async handleUnmuteCommand(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
    const success = await this.notificationService.updateUserPreferences(userId, { mutedUntil: undefined });

    if (success) {
      await interaction.reply({
        content: '🔔 Notifications unmuted successfully!',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Failed to unmute notifications.',
        ephemeral: true
      });
    }
  }

  private async handleTestCommand(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
    const testData = {
      messageUrl: 'https://discord.com/channels/test/test/test',
      noteId: 'test-note-123'
    };

    const notificationId = await this.notificationService.queueNotification(
      userId,
      'contributor_milestone_reached' as any,
      {
        milestoneName: 'Test Notification',
        metric: 'test messages',
        value: 1,
        ...testData
      }
    );

    if (notificationId) {
      await interaction.reply({
        content: '✅ Test notification queued! You should receive it shortly.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Failed to queue test notification.',
        ephemeral: true
      });
    }
  }
}