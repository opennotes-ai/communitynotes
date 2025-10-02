import { z } from 'zod';

export const DiscordServerConfigSchema = z.object({
  serverId: z.string(),
  enabled: z.boolean().default(true),
  enabledChannels: z.array(z.string()).default([]),
  disabledChannels: z.array(z.string()).default([]),
  moderatorRoles: z.array(z.string()).default([]),
  contributorRoles: z.array(z.string()).default([]),
  settings: z.object({
    allowNoteRequests: z.boolean().default(true),
    allowNoteCreation: z.boolean().default(true),
    maxRequestsPerUser: z.number().default(5),
    requireVerification: z.boolean().default(true),
  }).default({}),
});

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