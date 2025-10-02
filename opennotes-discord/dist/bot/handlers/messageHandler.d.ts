import { Message } from 'discord.js';
import type { DiscordBot } from '../client.js';
export declare class MessageHandler {
    private bot;
    private communityNoteService;
    private messageService;
    private noteDisplayService;
    constructor(bot: DiscordBot);
    handleMessage(message: Message): Promise<void>;
    private handleLegacyCommand;
    private handleStatusCommand;
    private handleHelpCommand;
    private formatUptime;
    /**
     * Checks for existing open notes and displays them if they meet auto-display criteria
     */
    private checkAndDisplayNotes;
}
//# sourceMappingURL=messageHandler.d.ts.map