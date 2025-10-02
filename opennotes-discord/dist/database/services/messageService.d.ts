import { Message } from '@prisma/client';
import { MessageContext } from '../../shared/types/discord.js';
export declare class MessageService {
    findByDiscordId(discordId: string): Promise<Message | null>;
    createMessage(context: MessageContext): Promise<Message>;
    updateRequestStats(messageId: string): Promise<Message>;
    getMessagesNeedingNotes(serverId: string, minRequests: number, limit?: number): Promise<Message[]>;
    getRecentMessages(serverId: string, channelId?: string, hours?: number): Promise<Message[]>;
    markHasActiveNote(messageId: string, hasActiveNote: boolean): Promise<Message>;
    getMessageStats(messageId: string): Promise<{
        totalRequests: number;
        uniqueRequestors: number;
        totalNotes: number;
        visibleNotes: number;
    }>;
    getMessagesWithRequests(serverId?: string, limit?: number): Promise<any[]>;
}
//# sourceMappingURL=messageService.d.ts.map