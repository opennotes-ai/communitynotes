import { Interaction } from 'discord.js';
import type { DiscordBot } from '../client.js';
export declare class InteractionHandler {
    private bot;
    private verificationService;
    private verificationMiddleware;
    private verificationCommands;
    private adminCommands;
    private userService;
    private serverService;
    private messageService;
    private noteRequestService;
    private rateLimitingService;
    constructor(bot: DiscordBot);
    handleInteraction(interaction: Interaction): Promise<void>;
    private handleSlashCommand;
    private handleMessageContextMenu;
    private handleButton;
    private handleSelectMenu;
    private handleModalSubmit;
    private handleStatusCommand;
    private handleNoteRequest;
    private showNoteRequestModal;
    private handleNoteRequestModal;
    private formatUptime;
}
//# sourceMappingURL=interactionHandler.d.ts.map