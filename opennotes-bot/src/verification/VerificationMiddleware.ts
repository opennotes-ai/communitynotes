import { Request, Response, NextFunction } from 'express';
import { CommandInteraction, GuildMember } from 'discord.js';
import { VerificationService } from './VerificationService.js';
import { logger } from '../shared/utils/logger.js';

export class VerificationMiddleware {
  constructor(private verificationService: VerificationService) {}

  // Express middleware for API endpoints
  requireVerification() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const discordUserId = req.headers['x-discord-user-id'] as string;

        if (!discordUserId) {
          return res.status(400).json({
            error: 'Discord user ID required',
            message: 'Please provide a valid Discord user ID in the x-discord-user-id header',
          });
        }

        const isVerified = await this.verificationService.isUserVerified(discordUserId);

        if (!isVerified) {
          return res.status(403).json({
            error: 'Verification required',
            message: 'You must verify your account before using this feature. Use /verify to start verification.',
            code: 'VERIFICATION_REQUIRED',
          });
        }

        // Add user permissions to request for downstream handlers
        const permissions = await this.verificationService.getUserPermissions(discordUserId);
        req.userPermissions = permissions;
        req.discordUserId = discordUserId;

        next();
      } catch (error) {
        logger.error('Error in verification middleware', {
          error: (error as Error).message,
          discordUserId: req.headers['x-discord-user-id'],
        });

        res.status(500).json({
          error: 'Internal server error',
          message: 'An error occurred while checking verification status',
        });
      }
    };
  }

  // Discord interaction middleware for slash commands
  async requireVerificationForInteraction(interaction: CommandInteraction): Promise<boolean> {
    try {
      const discordUserId = interaction.user.id;
      const isVerified = await this.verificationService.isUserVerified(discordUserId);

      if (!isVerified) {
        await interaction.reply({
          content: '⚠️ **Verification Required**\n\nYou must verify your account before using Community Notes features.\n\nUse `/verify` to start the verification process.',
          ephemeral: true,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error checking verification for interaction', {
        error: (error as Error).message,
        userId: interaction.user.id,
        commandName: interaction.commandName,
      });

      await interaction.reply({
        content: '❌ An error occurred while checking your verification status. Please try again.',
        ephemeral: true,
      });

      return false;
    }
  }

  // Check if user can perform specific actions
  async requirePermission(
    discordUserId: string,
    permission: keyof import('../shared/types/verification.js').UserPermissions
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const permissions = await this.verificationService.getUserPermissions(discordUserId);

      if (!permissions.isVerified) {
        return {
          allowed: false,
          reason: 'Account verification required',
        };
      }

      if (!permissions[permission]) {
        return {
          allowed: false,
          reason: `Permission '${permission}' not granted`,
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking user permission', {
        error: (error as Error).message,
        discordUserId,
        permission,
      });

      return {
        allowed: false,
        reason: 'Error checking permissions',
      };
    }
  }

  // Middleware specifically for note creation
  requireNoteCreationPermission() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const discordUserId = req.discordUserId;

      if (!discordUserId) {
        return res.status(400).json({
          error: 'Discord user ID required',
        });
      }

      const permissionCheck = await this.requirePermission(discordUserId, 'canCreateNotes');

      if (!permissionCheck.allowed) {
        return res.status(403).json({
          error: 'Permission denied',
          message: permissionCheck.reason || 'You do not have permission to create notes',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }

      next();
    };
  }

  // Middleware specifically for note requests
  requireNoteRequestPermission() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const discordUserId = req.discordUserId;

      if (!discordUserId) {
        return res.status(400).json({
          error: 'Discord user ID required',
        });
      }

      const permissionCheck = await this.requirePermission(discordUserId, 'canRequestNotes');

      if (!permissionCheck.allowed) {
        return res.status(403).json({
          error: 'Permission denied',
          message: permissionCheck.reason || 'You do not have permission to request notes',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }

      next();
    };
  }

  // Middleware for note rating
  requireNoteRatingPermission() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const discordUserId = req.discordUserId;

      if (!discordUserId) {
        return res.status(400).json({
          error: 'Discord user ID required',
        });
      }

      const permissionCheck = await this.requirePermission(discordUserId, 'canRateNotes');

      if (!permissionCheck.allowed) {
        return res.status(403).json({
          error: 'Permission denied',
          message: permissionCheck.reason || 'You do not have permission to rate notes',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
      }

      next();
    };
  }

  // Check if user is a moderator
  async isModerator(discordUserId: string): Promise<boolean> {
    try {
      const permissions = await this.verificationService.getUserPermissions(discordUserId);
      return permissions.isModerator;
    } catch (error) {
      logger.error('Error checking moderator status', {
        error: (error as Error).message,
        discordUserId,
      });
      return false;
    }
  }

  // Middleware for moderator-only actions
  requireModerator() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const discordUserId = req.discordUserId;

      if (!discordUserId) {
        return res.status(400).json({
          error: 'Discord user ID required',
        });
      }

      const isMod = await this.isModerator(discordUserId);

      if (!isMod) {
        return res.status(403).json({
          error: 'Permission denied',
          message: 'Moderator privileges required',
          code: 'MODERATOR_REQUIRED',
        });
      }

      next();
    };
  }
}

// Extend Express Request interface to include verification data
declare global {
  namespace Express {
    interface Request {
      discordUserId?: string;
      userPermissions?: import('../shared/types/verification.js').UserPermissions;
    }
  }
}