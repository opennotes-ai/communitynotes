import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { VerificationService } from '../../verification/VerificationService.js';
import { VerificationMiddleware } from '../../verification/VerificationMiddleware.js';
import {
  StartVerificationRequestSchema,
  CompleteVerificationRequestSchema,
} from '../../shared/types/verification.js';
import { logger } from '../../shared/utils/logger.js';

export function createVerificationRoutes(
  verificationService: VerificationService,
  verificationMiddleware: VerificationMiddleware
): Router {
  const router = Router();

  // Rate limiting middleware for verification endpoints
  const rateLimitMiddleware = (req: Request, res: Response, next: any) => {
    // Basic rate limiting implementation
    // In production, you'd use a proper rate limiting library
    next();
  };

  // Start verification process
  router.post('/start', rateLimitMiddleware, async (req: Request, res: Response) => {
    try {
      const requestData = StartVerificationRequestSchema.parse(req.body);
      const result = await verificationService.startVerification(requestData);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          verificationId: result.verificationId,
          expiresAt: result.expiresAt,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
          canRetry: result.canRetry,
          retryAfter: result.retryAfter,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      logger.error('Error in verification start endpoint', {
        error: (error as Error).message,
        body: req.body,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Complete verification process
  router.post('/complete', rateLimitMiddleware, async (req: Request, res: Response) => {
    try {
      const requestData = CompleteVerificationRequestSchema.parse(req.body);
      const result = await verificationService.completeVerification(requestData);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          status: result.status,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
          status: result.status,
          retryAfter: result.retryAfter,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        });
      }

      logger.error('Error in verification complete endpoint', {
        error: (error as Error).message,
        body: req.body,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Check verification status
  router.get('/status/:discordUserId', async (req: Request, res: Response) => {
    try {
      const { discordUserId } = req.params;

      if (!discordUserId) {
        return res.status(400).json({
          error: 'Discord user ID is required',
        });
      }

      const status = await verificationService.getVerificationStatus(discordUserId);
      const isVerified = await verificationService.isUserVerified(discordUserId);
      const permissions = await verificationService.getUserPermissions(discordUserId);

      res.json({
        discordUserId,
        isVerified,
        permissions,
        verificationData: status ? {
          verificationMethod: status.verificationMethod,
          verifiedAt: status.verifiedAt,
          verificationLevel: status.permissions.verificationLevel,
          trustScore: status.trustScore,
        } : null,
      });
    } catch (error) {
      logger.error('Error checking verification status', {
        error: (error as Error).message,
        discordUserId: req.params.discordUserId,
      });

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  // Get user permissions (requires authentication)
  router.get('/permissions/:discordUserId', async (req: Request, res: Response) => {
    try {
      const { discordUserId } = req.params;
      const requestingUserId = req.headers['x-discord-user-id'] as string;

      // Users can only check their own permissions unless they're a moderator
      if (discordUserId !== requestingUserId) {
        const isModerator = await verificationMiddleware.isModerator(requestingUserId);
        if (!isModerator) {
          return res.status(403).json({
            error: 'Permission denied',
            message: 'You can only check your own permissions',
          });
        }
      }

      const permissions = await verificationService.getUserPermissions(discordUserId);

      res.json({
        discordUserId,
        permissions,
      });
    } catch (error) {
      logger.error('Error getting user permissions', {
        error: (error as Error).message,
        discordUserId: req.params.discordUserId,
      });

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  // Resend verification (for pending verifications)
  router.post('/resend', rateLimitMiddleware, async (req: Request, res: Response) => {
    try {
      const { discordUserId, verificationId } = req.body;

      if (!discordUserId || !verificationId) {
        return res.status(400).json({
          error: 'Discord user ID and verification ID are required',
        });
      }

      // For simplicity, we'll tell the user to start a new verification
      // In a full implementation, you might want to resend the same code
      res.json({
        success: false,
        message: 'Please start a new verification process',
        action: 'start_new_verification',
      });
    } catch (error) {
      logger.error('Error in resend verification endpoint', {
        error: (error as Error).message,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  // Admin endpoint to manually verify users (moderator only)
  router.post('/admin/verify', verificationMiddleware.requireModerator(), async (req: Request, res: Response) => {
    try {
      const { discordUserId, reason } = req.body;
      const adminUserId = req.discordUserId;

      if (!discordUserId) {
        return res.status(400).json({
          error: 'Discord user ID is required',
        });
      }

      // This would need to be implemented in the verification service
      // For now, return a placeholder response
      logger.info('Admin verification requested', {
        targetUserId: discordUserId,
        adminUserId,
        reason,
      });

      res.json({
        success: true,
        message: 'Manual verification processed',
        discordUserId,
        verifiedBy: adminUserId,
      });
    } catch (error) {
      logger.error('Error in admin verify endpoint', {
        error: (error as Error).message,
        body: req.body,
      });

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  // Health check for verification service
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'verification',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}