import { PrismaClient } from '@prisma/client';
declare let prisma: PrismaClient;
declare global {
    var __db__: PrismaClient | undefined;
}
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export declare function healthCheck(): Promise<boolean>;
export { prisma };
export default prisma;
//# sourceMappingURL=client.d.ts.map