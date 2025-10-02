import { ChatInputCommandInteraction } from 'discord.js';
export declare class AdminCommands {
    private adminService;
    private serverService;
    private userService;
    constructor();
    static getSlashCommand(): import("discord.js").SlashCommandSubcommandsOnlyBuilder;
    handleConfigureCommand(interaction: ChatInputCommandInteraction): Promise<void>;
    private handleEnableChannel;
    private handleDisableChannel;
    private handleContributor;
    private handleEmergency;
    private handleStats;
    private handleModeration;
}
//# sourceMappingURL=AdminCommands.d.ts.map