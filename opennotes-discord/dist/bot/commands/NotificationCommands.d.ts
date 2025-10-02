import { ChatInputCommandInteraction } from 'discord.js';
import { NotificationService } from '../../notifications/NotificationService.js';
import { UserService } from '../../database/services/userService.js';
export declare class NotificationCommands {
    private notificationService;
    private userService;
    constructor(notificationService: NotificationService, userService: UserService);
    getNotificationSettingsCommand(): import("discord.js").SlashCommandSubcommandsOnlyBuilder;
    handleNotificationCommand(interaction: ChatInputCommandInteraction): Promise<void>;
    private handleSettingsCommand;
    private showNotificationTypeToggle;
    private showMethodSelection;
    private showBatchingConfig;
    private handleMuteCommand;
    private handleUnmuteCommand;
    private handleTestCommand;
}
//# sourceMappingURL=NotificationCommands.d.ts.map