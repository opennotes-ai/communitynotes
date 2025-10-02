import { NotificationType, NotificationPriority } from './types.js';
import { logger } from '../shared/utils/logger.js';
import { prisma } from '../database/client.js';
export class NotificationIntegration {
    notificationService;
    requestAggregationService;
    userService;
    constructor(notificationService, requestAggregationService, userService) {
        this.notificationService = notificationService;
        this.requestAggregationService = requestAggregationService;
        this.userService = userService;
    }
    async handleNewRequestThresholdMet(messageId) {
        try {
            const shouldNotify = await this.requestAggregationService.shouldNotifyContributors(messageId);
            if (!shouldNotify.shouldNotify) {
                return;
            }
            // Get message details
            const message = await prisma.message.findUnique({
                where: { id: messageId },
                include: {
                    server: true
                }
            });
            if (!message) {
                logger.warn('Message not found for threshold notification', { messageId });
                return;
            }
            // Get trusted contributors and active users in this server
            const contributors = await this.getEligibleContributors(message.serverId);
            // Queue notifications for contributors
            for (const contributor of contributors) {
                const notificationData = {
                    messageId,
                    messageUrl: `https://discord.com/channels/${message.serverId}/${message.channelId}/${message.discordId}`,
                    serverId: message.serverId,
                    serverName: message.server.name,
                    requestCount: shouldNotify.totalRequests,
                    uniqueRequestors: shouldNotify.uniqueRequestors,
                    channelId: message.channelId
                };
                await this.notificationService.queueNotification(contributor.id, NotificationType.NEW_REQUESTS_THRESHOLD_MET, notificationData, NotificationPriority.HIGH);
            }
            // Mark as notified
            await this.requestAggregationService.markContributorsNotified(messageId);
            logger.info('Threshold met notifications queued', {
                messageId,
                contributorCount: contributors.length,
                requestCount: shouldNotify.totalRequests
            });
        }
        catch (error) {
            logger.error('Error handling new request threshold met', {
                messageId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async handleNotePublishedOnRequest(noteId) {
        try {
            // Get note details
            const note = await prisma.openNote.findUnique({
                where: { id: noteId },
                include: {
                    message: {
                        include: {
                            noteRequests: {
                                include: { requestor: true }
                            }
                        }
                    }
                }
            });
            if (!note) {
                logger.warn('Note not found for published notification', { noteId });
                return;
            }
            // Notify all users who requested notes for this message
            for (const request of note.message.noteRequests) {
                if (!request.isActive)
                    continue;
                const notificationData = {
                    noteId,
                    messageId: note.messageId,
                    messageUrl: `https://discord.com/channels/${note.message.serverId}/${note.message.channelId}/${note.message.discordId}`,
                    noteClassification: note.classification,
                    noteContent: note.content.substring(0, 200) + (note.content.length > 200 ? '...' : ''),
                    authorId: note.authorId
                };
                await this.notificationService.queueNotification(request.requestorId, NotificationType.NOTE_PUBLISHED_ON_REQUEST, notificationData, NotificationPriority.MEDIUM);
            }
            logger.info('Note published notifications queued', {
                noteId,
                requestorCount: note.message.noteRequests.length
            });
        }
        catch (error) {
            logger.error('Error handling note published on request', {
                noteId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async handleNoteReceivedRatings(noteId, newRating) {
        try {
            // Get note with aggregated ratings
            const note = await prisma.openNote.findUnique({
                where: { id: noteId },
                include: {
                    author: true,
                    message: true,
                    ratings: {
                        orderBy: { timestamp: 'desc' }
                    }
                }
            });
            if (!note) {
                logger.warn('Note not found for rating notification', { noteId });
                return;
            }
            // Don't notify if the author rated their own note
            if (note.authorId === newRating.raterId) {
                return;
            }
            // Check if we should batch ratings notifications (only notify on certain milestones)
            const totalRatings = note.ratings.length;
            const shouldNotify = this.shouldNotifyForRatingCount(totalRatings);
            if (!shouldNotify) {
                return;
            }
            const notificationData = {
                noteId,
                messageId: note.messageId,
                messageUrl: `https://discord.com/channels/${note.message.serverId}/${note.message.channelId}/${note.message.discordId}`,
                helpfulCount: note.helpfulCount,
                notHelpfulCount: note.notHelpfulCount,
                totalRatings: note.totalRatings,
                helpfulnessRatio: note.helpfulnessRatio,
                recentRating: newRating.helpful,
                raterId: newRating.raterId
            };
            await this.notificationService.queueNotification(note.authorId, NotificationType.NOTE_RECEIVED_RATINGS, notificationData, NotificationPriority.LOW);
            logger.info('Note rating notification queued', {
                noteId,
                authorId: note.authorId,
                totalRatings,
                helpful: newRating.helpful
            });
        }
        catch (error) {
            logger.error('Error handling note received ratings', {
                noteId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async handleNoteStatusChanged(noteId, oldStatus, newStatus) {
        try {
            const note = await prisma.openNote.findUnique({
                where: { id: noteId },
                include: {
                    author: true,
                    message: true
                }
            });
            if (!note) {
                logger.warn('Note not found for status change notification', { noteId });
                return;
            }
            // Only notify for significant status changes
            const significantChanges = ['crh', 'nrh', 'needs-more-ratings'];
            if (!significantChanges.includes(newStatus)) {
                return;
            }
            const notificationData = {
                noteId,
                messageId: note.messageId,
                messageUrl: `https://discord.com/channels/${note.message.serverId}/${note.message.channelId}/${note.message.discordId}`,
                oldStatus,
                newStatus,
                noteContent: note.content.substring(0, 200) + (note.content.length > 200 ? '...' : ''),
                helpfulnessRatio: note.helpfulnessRatio,
                totalRatings: note.totalRatings
            };
            const priority = newStatus === 'crh' ? NotificationPriority.MEDIUM : NotificationPriority.LOW;
            await this.notificationService.queueNotification(note.authorId, NotificationType.NOTE_STATUS_CHANGED, notificationData, priority);
            logger.info('Note status change notification queued', {
                noteId,
                authorId: note.authorId,
                oldStatus,
                newStatus
            });
        }
        catch (error) {
            logger.error('Error handling note status changed', {
                noteId,
                oldStatus,
                newStatus,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async handleContributorMilestone(userId, milestone) {
        try {
            const notificationData = {
                milestoneName: milestone.milestoneName,
                metric: milestone.metric,
                value: milestone.value,
                milestoneType: milestone.type
            };
            await this.notificationService.queueNotification(userId, NotificationType.CONTRIBUTOR_MILESTONE_REACHED, notificationData, NotificationPriority.LOW);
            logger.info('Contributor milestone notification queued', {
                userId,
                milestone: milestone.milestoneName,
                type: milestone.type,
                value: milestone.value
            });
        }
        catch (error) {
            logger.error('Error handling contributor milestone', {
                userId,
                milestone,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async checkAndTriggerMilestones(userId) {
        try {
            const user = await this.userService.getUserStats(userId);
            // Check for various milestones
            const milestones = [
                { value: 1, name: 'First Open Note', metric: 'open notes written' },
                { value: 5, name: 'Note Contributor', metric: 'open notes written' },
                { value: 10, name: 'Active Contributor', metric: 'open notes written' },
                { value: 25, name: 'Trusted Contributor', metric: 'open notes written' },
                { value: 50, name: 'Expert Contributor', metric: 'open notes written' },
                { value: 100, name: 'Master Contributor', metric: 'open notes written' },
            ];
            const ratingMilestones = [
                { value: 10, name: 'Community Reviewer', metric: 'note ratings provided' },
                { value: 50, name: 'Active Reviewer', metric: 'note ratings provided' },
                { value: 100, name: 'Dedicated Reviewer', metric: 'note ratings provided' },
                { value: 250, name: 'Expert Reviewer', metric: 'note ratings provided' },
            ];
            const helpfulnessMilestones = [
                { value: 100, name: 'Helpful Contributor', metric: 'helpfulness score' },
                { value: 500, name: 'Highly Helpful', metric: 'helpfulness score' },
                { value: 1000, name: 'Expert Helper', metric: 'helpfulness score' },
            ];
            // Check note milestones
            for (const milestone of milestones) {
                if (user.totalNotes === milestone.value) {
                    await this.handleContributorMilestone(userId, {
                        type: 'notes',
                        metric: milestone.metric,
                        value: milestone.value,
                        milestoneName: milestone.name
                    });
                }
            }
            // Check rating milestones
            for (const milestone of ratingMilestones) {
                if (user.totalRatings === milestone.value) {
                    await this.handleContributorMilestone(userId, {
                        type: 'ratings',
                        metric: milestone.metric,
                        value: milestone.value,
                        milestoneName: milestone.name
                    });
                }
            }
            // Check helpfulness milestones
            for (const milestone of helpfulnessMilestones) {
                if (Math.floor(user.helpfulnessScore) === milestone.value) {
                    await this.handleContributorMilestone(userId, {
                        type: 'helpfulness',
                        metric: milestone.metric,
                        value: milestone.value,
                        milestoneName: milestone.name
                    });
                }
            }
            // Check trust level milestones
            if (user.trustLevel === 'contributor' || user.trustLevel === 'trusted') {
                const trustMilestone = user.trustLevel === 'contributor' ? 'Verified Contributor' : 'Trusted Community Member';
                await this.handleContributorMilestone(userId, {
                    type: 'trust_level',
                    metric: 'trust level',
                    value: user.trustLevel === 'contributor' ? 1 : 2,
                    milestoneName: trustMilestone
                });
            }
        }
        catch (error) {
            logger.error('Error checking and triggering milestones', {
                userId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async getEligibleContributors(serverId) {
        try {
            // Get trusted contributors and active users in this server
            const contributors = await prisma.user.findMany({
                where: {
                    OR: [
                        { trustLevel: 'contributor' },
                        { trustLevel: 'trusted' },
                        {
                            totalNotes: { gte: 3 },
                            helpfulnessScore: { gte: 50 }
                        }
                    ],
                    serverMemberships: {
                        some: {
                            server: { discordId: serverId }
                        }
                    },
                    notifyNewRequests: true
                },
                select: { id: true },
                take: 50 // Limit to prevent spam
            });
            return contributors;
        }
        catch (error) {
            logger.error('Error getting eligible contributors', {
                serverId,
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
    }
    shouldNotifyForRatingCount(totalRatings) {
        // Notify on first rating and then at certain milestones to avoid spam
        const notificationMilestones = [1, 5, 10, 25, 50, 100];
        return notificationMilestones.includes(totalRatings);
    }
    async processScheduledNotifications() {
        try {
            // Check for messages that need contributor notifications
            const messagesToNotify = await this.requestAggregationService.getMessagesNeedingContributorNotification();
            for (const aggregation of messagesToNotify) {
                await this.handleNewRequestThresholdMet(aggregation.messageId);
            }
            logger.info('Processed scheduled notifications', {
                messagesProcessed: messagesToNotify.length
            });
        }
        catch (error) {
            logger.error('Error processing scheduled notifications', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
}
//# sourceMappingURL=NotificationIntegration.js.map