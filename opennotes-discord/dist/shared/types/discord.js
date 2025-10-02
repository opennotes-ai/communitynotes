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
//# sourceMappingURL=discord.js.map