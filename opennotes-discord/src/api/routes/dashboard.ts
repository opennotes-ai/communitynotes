import express from 'express';
import { MessageService } from '../../database/services/messageService.js';
import { NoteRequestService } from '../../database/services/noteRequestService.js';
import { OpenNoteService } from '../../database/services/openNoteService.js';
import { ServerService } from '../../database/services/serverService.js';
import { UserService } from '../../database/services/userService.js';
import { AdminService } from '../../database/services/adminService.js';
import { VerificationService } from '../../verification/VerificationService.js';
import { logger } from '../../shared/utils/logger.js';
import jwt from 'jsonwebtoken';
import { appConfig } from '../../shared/config/index.js';

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    discordId: string;
    permissions: any;
  };
}

const router = express.Router();

// Initialize services
const messageService = new MessageService();
const noteRequestService = new NoteRequestService();
const communityNoteService = new OpenNoteService();
const serverService = new ServerService();
const userService = new UserService();
const adminService = new AdminService();

export function createDashboardRoutes(verificationService: VerificationService) {
  // Authentication middleware for dashboard
  const authenticateContributor = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
      }

      const decoded = jwt.verify(token, appConfig.JWT_SECRET) as any;
      const user = await userService.findByDiscordId(decoded.discordId);

      if (!user) {
        return res.status(401).json({ error: 'Invalid token. User not found.' });
      }

      // Check if user is verified
      const isVerified = await verificationService.isUserVerified(decoded.discordId);
      if (!isVerified) {
        return res.status(403).json({ error: 'Access denied. User not verified.' });
      }

      // Check contributor permissions
      const permissions = await verificationService.getUserPermissions(decoded.discordId);
      if (!permissions.canCreateNotes) {
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }

      req.user = { ...user, permissions };
      next();
    } catch (error) {
      logger.error('Dashboard authentication error:', error);
      res.status(401).json({ error: 'Invalid token.' });
    }
  };

  // Get dashboard feed data
  router.get('/feed', authenticateContributor, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const {
        serverId,
        channelId,
        timeframe = '24',
        minRequests = '1',
        status = 'pending',
        limit = '50',
        offset = '0'
      } = req.query;

      const timeframeHours = parseInt(timeframe as string);
      const minRequestCount = parseInt(minRequests as string);
      const requestLimit = Math.min(parseInt(limit as string), 100);
      const requestOffset = parseInt(offset as string);

      // Get servers user has access to
      let userServers: any[] = [];
      if (serverId) {
        const server = await serverService.findByDiscordId(serverId as string);
        if (server) {
          userServers = [server];
        }
      } else {
        // For now, get all servers - in production, this should be based on user permissions
        userServers = await serverService.getAllServers();
      }

      if (userServers.length === 0) {
        return res.json({
          requests: [],
          totalCount: 0,
          hasMore: false,
          metadata: {
            timeframe: timeframeHours,
            minRequests: minRequestCount,
            servers: []
          }
        });
      }

      // Get messages with note requests
      const messagesWithRequests = [];
      for (const server of userServers) {
        const messages = await messageService.getMessagesNeedingNotes(
          server.id,
          minRequestCount,
          requestLimit
        );

        for (const message of messages) {
          const requestCount = await noteRequestService.getRequestCountForMessage(message.id);
          const recentRequests = await noteRequestService.getRequestsForMessage(message.id, true);

          // Filter by timeframe
          const cutoffTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
          const recentRequestsInTimeframe = recentRequests.filter(req =>
            req.timestamp >= cutoffTime
          );

          if (recentRequestsInTimeframe.length >= minRequestCount) {
            messagesWithRequests.push({
              id: message.id,
              discordId: message.discordId,
              content: message.content,
              channelId: message.channelId,
              authorId: message.authorId,
              timestamp: message.timestamp,
              attachments: message.attachments,
              server: {
                id: server.id,
                name: server.name,
                discordId: server.discordId
              },
              requestCount: {
                total: requestCount.total,
                unique: requestCount.unique,
                recent: recentRequestsInTimeframe.length
              },
              requests: recentRequestsInTimeframe.map(req => ({
                id: req.id,
                timestamp: req.timestamp,
                reason: req.reason,
                sources: req.sources,
                requestor: (req as any).requestor ? {
                  id: (req as any).requestor.id,
                  username: (req as any).requestor.username,
                  trustLevel: (req as any).requestor.trustLevel,
                  helpfulnessScore: (req as any).requestor.helpfulnessScore
                } : null
              }))
            });
          }
        }
      }

      // Sort by request count and recency
      messagesWithRequests.sort((a, b) => {
        if (b.requestCount.recent !== a.requestCount.recent) {
          return b.requestCount.recent - a.requestCount.recent;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      // Apply pagination
      const paginatedResults = messagesWithRequests.slice(requestOffset, requestOffset + requestLimit);
      const hasMore = messagesWithRequests.length > requestOffset + requestLimit;

      res.json({
        requests: paginatedResults,
        totalCount: messagesWithRequests.length,
        hasMore,
        metadata: {
          timeframe: timeframeHours,
          minRequests: minRequestCount,
          servers: userServers.map(s => ({
            id: s.id,
            name: s.name,
            discordId: s.discordId
          }))
        }
      });

    } catch (error) {
      logger.error('Error getting dashboard feed:', error);
      res.status(500).json({ error: 'Failed to load dashboard feed' });
    }
  });

  // Get message details for note creation
  router.get('/message/:messageId', authenticateContributor, async (req: express.Request, res: express.Response) => {
    try {
      const { messageId } = req.params;

      const message = await messageService.findByDiscordId(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const requests = await noteRequestService.getRequestsForMessage(message.id);
      const stats = await messageService.getMessageStats(message.id);

      res.json({
        message: {
          id: message.id,
          discordId: message.discordId,
          content: message.content,
          channelId: message.channelId,
          authorId: message.authorId,
          timestamp: message.timestamp,
          attachments: message.attachments
        },
        requests: requests.map(req => ({
          id: req.id,
          timestamp: req.timestamp,
          reason: req.reason,
          sources: req.sources,
          requestor: (req as any).requestor ? {
            id: (req as any).requestor.id,
            username: (req as any).requestor.username,
            trustLevel: (req as any).requestor.trustLevel,
            helpfulnessScore: (req as any).requestor.helpfulnessScore
          } : null
        })),
        stats
      });

    } catch (error) {
      logger.error('Error getting message details:', error);
      res.status(500).json({ error: 'Failed to load message details' });
    }
  });

  // Get server list for filtering
  router.get('/servers', authenticateContributor, async (req: express.Request, res: express.Response) => {
    try {
      // In production, this should filter based on user permissions
      const servers = await serverService.getAllServers();

      res.json({
        servers: servers.map(server => ({
          id: server.id,
          name: server.name,
          discordId: server.discordId,
          enabled: server.enabled
        }))
      });

    } catch (error) {
      logger.error('Error getting servers:', error);
      res.status(500).json({ error: 'Failed to load servers' });
    }
  });

  // Get dashboard statistics
  router.get('/stats', authenticateContributor, async (req: express.Request, res: express.Response) => {
    try {
      const { timeframe = '24' } = req.query;
      const hours = parseInt(timeframe as string);

      const recentRequests = await noteRequestService.getRecentRequests(hours);
      const servers = await serverService.getAllServers();

      // Calculate statistics
      const totalRequests = recentRequests.length;
      const uniqueUsers = new Set(recentRequests.map(req => req.requestorId)).size;
      const serverStats = servers.map(server => {
        const serverRequests = recentRequests.filter(req =>
          (req as any).message?.serverId === server.id
        );
        return {
          serverId: server.id,
          serverName: server.name,
          requestCount: serverRequests.length,
          uniqueUsers: new Set(serverRequests.map(req => req.requestorId)).size
        };
      });

      // Request trends by hour
      const hourlyTrends = [];
      for (let i = hours - 1; i >= 0; i--) {
        const hourStart = new Date(Date.now() - i * 60 * 60 * 1000);
        const hourEnd = new Date(Date.now() - (i - 1) * 60 * 60 * 1000);

        const hourRequests = recentRequests.filter(req =>
          req.timestamp >= hourStart && req.timestamp < hourEnd
        );

        hourlyTrends.push({
          hour: hourStart.toISOString(),
          requests: hourRequests.length,
          uniqueUsers: new Set(hourRequests.map(req => req.requestorId)).size
        });
      }

      res.json({
        overview: {
          totalRequests,
          uniqueUsers,
          timeframe: hours
        },
        serverStats,
        trends: hourlyTrends
      });

    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      res.status(500).json({ error: 'Failed to load dashboard statistics' });
    }
  });

  // Create a new open note
  router.post('/notes', authenticateContributor, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { messageId, content, classification, sources } = req.body;

      if (!messageId || !content || !classification) {
        return res.status(400).json({ error: 'Message ID, content, and classification are required' });
      }

      // Get message from database
      const message = await messageService.findByDiscordId(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Check if user already has a note for this message
      const existingNotes = await communityNoteService.getNotesForMessage(message.id);
      const userExistingNote = existingNotes.find(note => note.authorId === req.user!.id);

      if (userExistingNote) {
        return res.status(409).json({ error: 'You have already written a note for this message' });
      }

      // Create the note
      const note = await communityNoteService.createNote({
        messageId: message.id,
        authorId: req.user!.id,
        content,
        classification,
        sources: sources || []
      });

      // Update user stats
      await userService.incrementNoteCount(req.user!.id);

      res.status(201).json({
        note: {
          id: note.id,
          content: note.content,
          classification: note.classification,
          sources: note.sources,
          status: note.status,
          submittedAt: note.submittedAt
        }
      });

    } catch (error) {
      logger.error('Error creating open note:', error);
      res.status(500).json({ error: 'Failed to create open note' });
    }
  });

  // Get user's notes
  router.get('/notes/my', authenticateContributor, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { limit = '20', offset = '0' } = req.query;
      const noteLimit = Math.min(parseInt(limit as string), 100);
      const noteOffset = parseInt(offset as string);

      const notes = await communityNoteService.getNotesByAuthor(req.user!.id, noteLimit);

      res.json({
        notes: notes.map((note: any) => ({
          id: note.id,
          content: note.content,
          classification: note.classification,
          sources: note.sources,
          status: note.status,
          submittedAt: note.submittedAt,
          helpfulCount: note.helpfulCount,
          notHelpfulCount: note.notHelpfulCount,
          totalRatings: note.totalRatings,
          helpfulnessRatio: note.helpfulnessRatio,
          isVisible: note.isVisible,
          message: note.message ? {
            id: note.message.discordId,
            content: note.message.content,
            channelId: note.message.channelId,
            timestamp: note.message.timestamp
          } : null
        })),
        hasMore: notes.length === noteLimit
      });

    } catch (error) {
      logger.error('Error getting user notes:', error);
      res.status(500).json({ error: 'Failed to load user notes' });
    }
  });

  // Get note by ID with details
  router.get('/notes/:noteId', authenticateContributor, async (req: express.Request, res: express.Response) => {
    try {
      const { noteId } = req.params;

      const note = await communityNoteService.findById(noteId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      res.json({
        note: {
          id: note.id,
          content: note.content,
          classification: note.classification,
          sources: note.sources,
          status: note.status,
          submittedAt: note.submittedAt,
          helpfulCount: note.helpfulCount,
          notHelpfulCount: note.notHelpfulCount,
          totalRatings: note.totalRatings,
          helpfulnessRatio: note.helpfulnessRatio,
          isVisible: note.isVisible,
          author: (note as any).author ? {
            id: (note as any).author.id,
            username: (note as any).author.username,
            trustLevel: (note as any).author.trustLevel,
            helpfulnessScore: (note as any).author.helpfulnessScore
          } : null,
          message: (note as any).message ? {
            id: (note as any).message.discordId,
            content: (note as any).message.content,
            channelId: (note as any).message.channelId,
            timestamp: (note as any).message.timestamp,
            server: (note as any).message.server ? {
              name: (note as any).message.server.name,
              discordId: (note as any).message.server.discordId
            } : null
          } : null,
          ratings: (note as any).ratings ? (note as any).ratings.map((rating: any) => ({
            id: rating.id,
            helpful: rating.helpful,
            reason: rating.reason,
            timestamp: rating.timestamp,
            rater: rating.rater ? {
              username: rating.rater.username,
              trustLevel: rating.rater.trustLevel
            } : null
          })) : []
        }
      });

    } catch (error) {
      logger.error('Error getting note details:', error);
      res.status(500).json({ error: 'Failed to load note details' });
    }
  });

  // Delete a note (only by author)
  router.delete('/notes/:noteId', authenticateContributor, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { noteId } = req.params;

      const note = await communityNoteService.findById(noteId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Check if user is the author
      if (note.authorId !== req.user!.id) {
        return res.status(403).json({ error: 'You can only delete your own notes' });
      }

      // Only allow deletion of pending notes
      if (note.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending notes can be deleted' });
      }

      await communityNoteService.deleteNote(noteId);

      res.json({ message: 'Note deleted successfully' });

    } catch (error) {
      logger.error('Error deleting note:', error);
      res.status(500).json({ error: 'Failed to delete note' });
    }
  });

  // Authentication endpoint for dashboard login
  router.post('/auth', async (req: express.Request, res: express.Response) => {
    try {
      const { discordId, token } = req.body;

      if (!discordId || !token) {
        return res.status(400).json({ error: 'Discord ID and token are required' });
      }

      // Verify Discord token (simplified - in production, verify with Discord API)
      const user = await userService.findByDiscordId(discordId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Check verification status
      const isVerified = await verificationService.isUserVerified(discordId);
      if (!isVerified) {
        return res.status(403).json({ error: 'User not verified' });
      }

      // Check permissions
      const permissions = await verificationService.getUserPermissions(discordId);
      if (!permissions.canCreateNotes) {
        return res.status(403).json({ error: 'Insufficient permissions for dashboard access' });
      }

      // Generate JWT token for dashboard session
      const dashboardToken = jwt.sign(
        {
          discordId,
          userId: user.id,
          permissions
        },
        appConfig.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token: dashboardToken,
        user: {
          id: user.id,
          discordId: user.discordId,
          username: user.username,
          permissions
        }
      });

    } catch (error) {
      logger.error('Dashboard auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Admin middleware - check if user has moderator permissions
  const authenticateAdmin = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
      }

      const decoded = jwt.verify(token, appConfig.JWT_SECRET) as any;
      const user = await userService.findByDiscordId(decoded.discordId);

      if (!user) {
        return res.status(401).json({ error: 'Invalid token. User not found.' });
      }

      // Check if user is verified
      const isVerified = await verificationService.isUserVerified(decoded.discordId);
      if (!isVerified) {
        return res.status(403).json({ error: 'Access denied. User not verified.' });
      }

      // Check admin permissions
      const permissions = await verificationService.getUserPermissions(decoded.discordId);
      if (!permissions.isModerator) {
        return res.status(403).json({ error: 'Access denied. Moderator permissions required.' });
      }

      req.user = { ...user, permissions };
      next();
    } catch (error) {
      logger.error('Admin authentication error:', error);
      res.status(401).json({ error: 'Invalid token.' });
    }
  };

  // Admin Stats
  router.get('/admin/stats', authenticateAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { serverId } = req.query;

      if (!serverId) {
        return res.status(400).json({ error: 'Server ID is required' });
      }

      const server = await serverService.findByDiscordId(serverId as string);
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      const stats = await adminService.getAdminStats(server.id);
      res.json(stats);

    } catch (error) {
      logger.error('Error getting admin stats:', error);
      res.status(500).json({ error: 'Failed to load admin statistics' });
    }
  });

  // Moderation Queue
  router.get('/admin/moderation', authenticateAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { serverId, status } = req.query;

      if (!serverId) {
        return res.status(400).json({ error: 'Server ID is required' });
      }

      const server = await serverService.findByDiscordId(serverId as string);
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      const queue = await adminService.getModerationQueue(server.id, status as string);
      res.json(queue);

    } catch (error) {
      logger.error('Error getting moderation queue:', error);
      res.status(500).json({ error: 'Failed to load moderation queue' });
    }
  });

  // Handle Moderation Action
  router.patch('/admin/moderation/:itemId', authenticateAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { itemId } = req.params;
      const { action, actionTaken } = req.body;

      if (!action) {
        return res.status(400).json({ error: 'Action is required' });
      }

      await adminService.reviewModerationItem(itemId, req.user!.id, action, actionTaken);
      res.json({ message: 'Moderation action completed successfully' });

    } catch (error) {
      logger.error('Error handling moderation action:', error);
      res.status(500).json({ error: 'Failed to handle moderation action' });
    }
  });

  // Channel Management
  router.patch('/admin/channels', authenticateAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { serverId, channelId, action } = req.body;

      if (!serverId || !channelId || !action) {
        return res.status(400).json({ error: 'Server ID, channel ID, and action are required' });
      }

      const server = await serverService.findByDiscordId(serverId);
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      if (action === 'enable') {
        await adminService.enableChannel(server.id, channelId, req.user!.id);
      } else if (action === 'disable') {
        await adminService.disableChannel(server.id, channelId, req.user!.id);
      } else {
        return res.status(400).json({ error: 'Invalid action. Use "enable" or "disable"' });
      }

      res.json({ message: `Channel ${action}d successfully` });

    } catch (error) {
      logger.error('Error managing channel:', error);
      res.status(500).json({ error: 'Failed to manage channel' });
    }
  });

  // Emergency Controls
  router.post('/admin/emergency', authenticateAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { serverId, action, reason } = req.body;

      if (!serverId || !action) {
        return res.status(400).json({ error: 'Server ID and action are required' });
      }

      const server = await serverService.findByDiscordId(serverId);
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      if (action === 'pause') {
        await adminService.pauseSystem(server.id, req.user!.id, reason);
      } else if (action === 'resume') {
        await adminService.resumeSystem(server.id, req.user!.id);
      } else {
        return res.status(400).json({ error: 'Invalid action. Use "pause" or "resume"' });
      }

      res.json({ message: `System ${action}d successfully` });

    } catch (error) {
      logger.error('Error handling emergency action:', error);
      res.status(500).json({ error: 'Failed to handle emergency action' });
    }
  });

  // Bulk Actions
  router.post('/admin/bulk', authenticateAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { serverId, action, targetType, targetIds } = req.body;

      if (!serverId || !action || !targetType || !targetIds || !Array.isArray(targetIds)) {
        return res.status(400).json({ error: 'Server ID, action, target type, and target IDs are required' });
      }

      const server = await serverService.findByDiscordId(serverId);
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      let count = 0;

      if (action === 'delete' && targetType === 'requests') {
        count = await adminService.bulkDeleteNoteRequests(server.id, targetIds, req.user!.id);
      } else if (action === 'delete' && targetType === 'notes') {
        count = await adminService.bulkDeleteOpenNotes(server.id, targetIds, req.user!.id);
      } else {
        return res.status(400).json({ error: 'Invalid action or target type' });
      }

      res.json({
        message: `Bulk action completed successfully`,
        count
      });

    } catch (error) {
      logger.error('Error handling bulk action:', error);
      res.status(500).json({ error: 'Failed to handle bulk action' });
    }
  });

  // Audit Logs
  router.get('/admin/audit', authenticateAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { serverId, limit } = req.query;

      if (!serverId) {
        return res.status(400).json({ error: 'Server ID is required' });
      }

      const server = await serverService.findByDiscordId(serverId as string);
      if (!server) {
        return res.status(404).json({ error: 'Server not found' });
      }

      const limitValue = limit ? parseInt(limit as string) : 50;
      const logs = await adminService.getAuditLogs(server.id, limitValue);

      res.json(logs);

    } catch (error) {
      logger.error('Error getting audit logs:', error);
      res.status(500).json({ error: 'Failed to load audit logs' });
    }
  });

  return router;
}