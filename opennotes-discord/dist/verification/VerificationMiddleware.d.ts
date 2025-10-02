import { Request, Response, NextFunction } from 'express';
import { CommandInteraction } from 'discord.js';
import { VerificationService } from './VerificationService.js';
export declare class VerificationMiddleware {
    private verificationService;
    constructor(verificationService: VerificationService);
    requireVerification(): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    requireVerificationForInteraction(interaction: CommandInteraction): Promise<boolean>;
    requirePermission(discordUserId: string, permission: keyof import('../shared/types/verification.js').UserPermissions): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    requireNoteCreationPermission(): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    requireNoteRequestPermission(): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    requireNoteRatingPermission(): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    isModerator(discordUserId: string): Promise<boolean>;
    requireModerator(): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
}
declare global {
    namespace Express {
        interface Request {
            discordUserId?: string;
            userPermissions?: import('../shared/types/verification.js').UserPermissions;
        }
    }
}
//# sourceMappingURL=VerificationMiddleware.d.ts.map