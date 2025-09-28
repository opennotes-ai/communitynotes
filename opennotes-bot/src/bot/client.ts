import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType,
  Events
} from 'discord.js';
import { appConfig } from '../shared/config/index.js';
import { logger } from '../shared/utils/logger.js';
import { MessageHandler } from './handlers/messageHandler.js';
import { InteractionHandler } from './handlers/interactionHandler.js';
import { VerificationCommands } from './commands/VerificationCommands.js';
import { NoteAuthoringCommands } from './commands/NoteAuthoringCommands.js';
import { NoteCommands } from './commands/noteCommands.js';
import { NotificationCommands } from './commands/NotificationCommands.js';
import { AdminCommands } from './commands/AdminCommands.js';
import { VerificationService } from '../verification/VerificationService.js';
import { NotificationService, NotificationIntegration } from '../notifications/index.js';
import { NotificationScheduler } from '../notifications/NotificationScheduler.js';
import { UserService, RequestAggregationService } from '../database/services/index.js';
import { BotStatus } from '../shared/types/discord.js';

export class DiscordBot {
  public client: Client;
  public messageHandler: MessageHandler;
  public interactionHandler: InteractionHandler;
  private verificationService: VerificationService;
  private notificationService: NotificationService;
  private notificationIntegration: NotificationIntegration;
  private notificationScheduler: NotificationScheduler;
  private userService: UserService;
  private requestAggregationService: RequestAggregationService;
  private verificationCommands: VerificationCommands;
  private noteAuthoringCommands: NoteAuthoringCommands;
  private noteCommands: NoteCommands;
  private notificationCommands: NotificationCommands;
  private isReady = false;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.User,
      ],
    });

    this.messageHandler = new MessageHandler(this);
    this.interactionHandler = new InteractionHandler(this);
    this.verificationService = new VerificationService();
    this.notificationService = new NotificationService(this.client);
    this.userService = new UserService();
    this.requestAggregationService = new RequestAggregationService();
    this.notificationIntegration = new NotificationIntegration(
      this.notificationService,
      this.requestAggregationService,
      this.userService
    );
    this.notificationScheduler = new NotificationScheduler(this.notificationIntegration);
    this.verificationCommands = new VerificationCommands(this.verificationService);
    this.noteAuthoringCommands = new NoteAuthoringCommands(this.verificationService);
    this.noteCommands = new NoteCommands();
    this.notificationCommands = new NotificationCommands(this.notificationService, this.userService);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.once(Events.ClientReady, this.onReady.bind(this));
    this.client.on(Events.Error, this.onError.bind(this));
    this.client.on(Events.Warn, this.onWarn.bind(this));
    this.client.on(Events.MessageCreate, this.messageHandler.handleMessage.bind(this.messageHandler));
    this.client.on(Events.InteractionCreate, this.interactionHandler.handleInteraction.bind(this.interactionHandler));
    this.client.on(Events.GuildCreate, this.onGuildJoin.bind(this));
    this.client.on(Events.GuildDelete, this.onGuildLeave.bind(this));
  }

  private async onReady(): Promise<void> {
    if (!this.client.user) {
      throw new Error('Client user is not available');
    }

    this.isReady = true;

    logger.info('Discord bot is ready!', {
      username: this.client.user.username,
      guilds: this.client.guilds.cache.size,
      users: this.client.users.cache.size,
    });

    // Set bot presence
    this.client.user.setPresence({
      activities: [{
        name: 'Community Notes',
        type: ActivityType.Watching,
      }],
      status: 'online',
    });

    // Register application commands
    await this.registerCommands();

    // Start notification service
    await this.notificationService.start();

    // Start notification scheduler
    this.notificationScheduler.start();
  }

  private async registerCommands(): Promise<void> {
    try {
      const commands = [
        {
          name: 'status',
          description: 'Check bot status and health',
        },
        AdminCommands.getSlashCommand().toJSON(),
        // Verification commands
        this.verificationCommands.getVerifyCommand().toJSON(),
        this.verificationCommands.getVerifyCodeCommand().toJSON(),
        this.verificationCommands.getStatusCommand().toJSON(),
        // Note authoring commands
        this.noteAuthoringCommands.getWriteNoteCommand().toJSON(),
        // Note viewing commands
        this.noteCommands.getViewNotesCommand().toJSON(),
        // Notification commands
        this.notificationCommands.getNotificationSettingsCommand().toJSON(),
        // Context menu commands
        {
          name: 'Request Community Note',
          type: 3, // MESSAGE context menu
        },
      ];

      if (this.client.application) {
        await this.client.application.commands.set(commands);
        logger.info('Successfully registered application commands');
      }
    } catch (error) {
      logger.error('Failed to register application commands', { error });
    }
  }

  private onError(error: Error): void {
    logger.error('Discord client error', { error: error.message, stack: error.stack });
  }

  private onWarn(warning: string): void {
    logger.warn('Discord client warning', { warning });
  }

  private async onGuildJoin(guild: any): Promise<void> {
    logger.info('Joined new guild', {
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
    });

    // TODO: Initialize server configuration in database
    // This will be implemented in task-4
  }

  private async onGuildLeave(guild: any): Promise<void> {
    logger.info('Left guild', {
      guildId: guild.id,
      guildName: guild.name,
    });

    // TODO: Clean up server data if needed
    // This will be implemented in task-4
  }

  public async start(): Promise<void> {
    try {
      await this.client.login(appConfig.DISCORD_TOKEN);
      logger.info('Discord bot login successful');
    } catch (error) {
      logger.error('Failed to login to Discord', { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (this.isReady) {
      // Stop notification services
      this.notificationScheduler.stop();
      await this.notificationService.stop();

      this.client.destroy();
      this.isReady = false;
      logger.info('Discord bot stopped');
    }
  }

  public getStatus(): BotStatus {
    return {
      ready: this.isReady,
      guilds: this.client.guilds.cache.size,
      users: this.client.users.cache.size,
      uptime: this.client.uptime,
      ping: this.client.ws.ping,
    };
  }

  public getNoteCommands(): NoteCommands {
    return this.noteCommands;
  }

  public getNoteAuthoringCommands(): NoteAuthoringCommands {
    return this.noteAuthoringCommands;
  }

  public getNotificationCommands(): NotificationCommands {
    return this.notificationCommands;
  }

  public getNotificationService(): NotificationService {
    return this.notificationService;
  }

  public getNotificationIntegration(): NotificationIntegration {
    return this.notificationIntegration;
  }
}