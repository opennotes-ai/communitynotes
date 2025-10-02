import { z } from 'zod';
export declare const DiscordServerConfigSchema: z.ZodObject<{
    serverId: z.ZodString;
    enabled: z.ZodDefault<z.ZodBoolean>;
    enabledChannels: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    disabledChannels: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    moderatorRoles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    contributorRoles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    settings: z.ZodDefault<z.ZodObject<{
        allowNoteRequests: z.ZodDefault<z.ZodBoolean>;
        allowNoteCreation: z.ZodDefault<z.ZodBoolean>;
        maxRequestsPerUser: z.ZodDefault<z.ZodNumber>;
        requireVerification: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        allowNoteRequests: boolean;
        allowNoteCreation: boolean;
        maxRequestsPerUser: number;
        requireVerification: boolean;
    }, {
        allowNoteRequests?: boolean | undefined;
        allowNoteCreation?: boolean | undefined;
        maxRequestsPerUser?: number | undefined;
        requireVerification?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    serverId: string;
    enabled: boolean;
    enabledChannels: string[];
    disabledChannels: string[];
    moderatorRoles: string[];
    contributorRoles: string[];
    settings: {
        allowNoteRequests: boolean;
        allowNoteCreation: boolean;
        maxRequestsPerUser: number;
        requireVerification: boolean;
    };
}, {
    serverId: string;
    enabled?: boolean | undefined;
    enabledChannels?: string[] | undefined;
    disabledChannels?: string[] | undefined;
    moderatorRoles?: string[] | undefined;
    contributorRoles?: string[] | undefined;
    settings?: {
        allowNoteRequests?: boolean | undefined;
        allowNoteCreation?: boolean | undefined;
        maxRequestsPerUser?: number | undefined;
        requireVerification?: boolean | undefined;
    } | undefined;
}>;
export type DiscordServerConfig = z.infer<typeof DiscordServerConfigSchema>;
export interface MessageContext {
    messageId: string;
    channelId: string;
    serverId: string;
    authorId: string;
    content: string;
    timestamp: Date;
    attachments?: string[];
}
export interface NoteRequest {
    id: string;
    messageId: string;
    requestorId: string;
    timestamp: Date;
    sources?: string[];
    reason?: string;
}
export interface OpenNote {
    id: string;
    messageId: string;
    authorId: string;
    content: string;
    classification: 'misleading' | 'lacking-context' | 'disputed' | 'unsubstantiated';
    sources: string[];
    status: 'pending' | 'crh' | 'nrh' | 'needs-more-ratings';
    createdAt: Date;
    updatedAt: Date;
}
export interface NoteRating {
    id: string;
    noteId: string;
    raterId: string;
    helpful: boolean;
    timestamp: Date;
    reason?: string;
}
export interface BotStatus {
    ready: boolean;
    guilds: number;
    users: number;
    uptime: number | null;
    ping: number;
}
//# sourceMappingURL=discord.d.ts.map