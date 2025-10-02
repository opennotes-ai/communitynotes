import type { DiscordBot } from '../bot/client.js';
export declare class ApiServer {
    private bot;
    private app;
    private server;
    private io?;
    private verificationService;
    private verificationMiddleware;
    constructor(bot: DiscordBot);
    private setupMiddleware;
    private setupRoutes;
    private setupSocketIO;
    emitDashboardUpdate(event: string, data: any, serverId?: string): void;
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map