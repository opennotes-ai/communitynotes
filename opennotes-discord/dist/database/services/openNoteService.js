import { prisma } from '../client.js';
import { logger } from '../../shared/utils/logger.js';
import { requestorScoringService } from '../../external/scoringAdapter.js';
export class OpenNoteService {
    async createNote(data) {
        try {
            return await prisma.openNote.create({
                data: {
                    messageId: data.messageId,
                    authorId: data.authorId,
                    content: data.content,
                    classification: data.classification,
                    sources: data.sources,
                },
            });
        }
        catch (error) {
            logger.error('Error creating open note:', error);
            throw error;
        }
    }
    async findById(id) {
        try {
            return await prisma.openNote.findUnique({
                where: { id },
                include: {
                    author: {
                        select: {
                            id: true,
                            discordId: true,
                            username: true,
                            helpfulnessScore: true,
                            trustLevel: true,
                        },
                    },
                    message: {
                        include: {
                            server: true,
                        },
                    },
                    ratings: {
                        include: {
                            rater: {
                                select: {
                                    id: true,
                                    discordId: true,
                                    username: true,
                                    trustLevel: true,
                                },
                            },
                        },
                    },
                },
            });
        }
        catch (error) {
            logger.error('Error finding open note by ID:', error);
            throw error;
        }
    }
    async getNotesForMessage(messageId, visibleOnly = false) {
        try {
            return await prisma.openNote.findMany({
                where: {
                    messageId,
                    ...(visibleOnly && { isVisible: true }),
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            discordId: true,
                            username: true,
                            helpfulnessScore: true,
                            trustLevel: true,
                        },
                    },
                    ratings: {
                        include: {
                            rater: {
                                select: {
                                    id: true,
                                    discordId: true,
                                    username: true,
                                    trustLevel: true,
                                },
                            },
                        },
                    },
                },
                orderBy: [
                    { isVisible: 'desc' },
                    { helpfulnessRatio: 'desc' },
                    { submittedAt: 'asc' },
                ],
            });
        }
        catch (error) {
            logger.error('Error getting notes for message:', error);
            throw error;
        }
    }
    async updateNoteStatus(noteId, status) {
        try {
            const updatedNote = await prisma.openNote.update({
                where: { id: noteId },
                data: {
                    status,
                    lastStatusAt: new Date(),
                },
            });
            // Process requestor scoring when note reaches CRH status
            if (status === 'crh') {
                try {
                    await requestorScoringService.processNoteStatusChange(noteId, status);
                }
                catch (scoringError) {
                    logger.error('Error processing requestor scoring for note status change:', scoringError);
                    // Don't fail the status update if scoring fails
                }
            }
            return updatedNote;
        }
        catch (error) {
            logger.error('Error updating note status:', error);
            throw error;
        }
    }
    async updateVisibility(noteId, isVisible, visibilityScore) {
        try {
            return await prisma.openNote.update({
                where: { id: noteId },
                data: {
                    isVisible,
                    ...(visibilityScore !== undefined && { visibilityScore }),
                },
            });
        }
        catch (error) {
            logger.error('Error updating note visibility:', error);
            throw error;
        }
    }
    async recalculateRatingStats(noteId) {
        try {
            const note = await prisma.openNote.findUnique({
                where: { id: noteId },
                include: {
                    ratings: true,
                },
            });
            if (!note) {
                throw new Error('Note not found');
            }
            const helpfulCount = note.ratings.filter(r => r.helpful).length;
            const notHelpfulCount = note.ratings.filter(r => !r.helpful).length;
            const totalRatings = note.ratings.length;
            const helpfulnessRatio = totalRatings > 0 ? helpfulCount / totalRatings : 0;
            return await prisma.openNote.update({
                where: { id: noteId },
                data: {
                    helpfulCount,
                    notHelpfulCount,
                    totalRatings,
                    helpfulnessRatio,
                },
            });
        }
        catch (error) {
            logger.error('Error recalculating rating stats:', error);
            throw error;
        }
    }
    async getNotesByAuthor(authorId, limit = 50) {
        try {
            return await prisma.openNote.findMany({
                where: { authorId },
                include: {
                    message: {
                        include: {
                            server: true,
                        },
                    },
                    ratings: true,
                },
                orderBy: { submittedAt: 'desc' },
                take: limit,
            });
        }
        catch (error) {
            logger.error('Error getting notes by author:', error);
            throw error;
        }
    }
    async getPendingNotes(serverId, limit = 50) {
        try {
            return await prisma.openNote.findMany({
                where: {
                    status: 'pending',
                    ...(serverId && {
                        message: {
                            serverId,
                        },
                    }),
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            discordId: true,
                            username: true,
                            trustLevel: true,
                        },
                    },
                    message: {
                        include: {
                            server: true,
                        },
                    },
                    ratings: {
                        include: {
                            rater: {
                                select: {
                                    id: true,
                                    discordId: true,
                                    username: true,
                                    trustLevel: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { submittedAt: 'asc' },
                take: limit,
            });
        }
        catch (error) {
            logger.error('Error getting pending notes:', error);
            throw error;
        }
    }
    async getTopNotes(serverId, days = 7, limit = 20) {
        try {
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            return await prisma.openNote.findMany({
                where: {
                    isVisible: true,
                    submittedAt: { gte: since },
                    ...(serverId && {
                        message: {
                            serverId,
                        },
                    }),
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            discordId: true,
                            username: true,
                            helpfulnessScore: true,
                        },
                    },
                    message: {
                        include: {
                            server: true,
                        },
                    },
                },
                orderBy: [
                    { helpfulnessRatio: 'desc' },
                    { totalRatings: 'desc' },
                    { submittedAt: 'desc' },
                ],
                take: limit,
            });
        }
        catch (error) {
            logger.error('Error getting top notes:', error);
            throw error;
        }
    }
    async deleteNote(noteId) {
        try {
            await prisma.openNote.delete({
                where: { id: noteId },
            });
        }
        catch (error) {
            logger.error('Error deleting note:', error);
            throw error;
        }
    }
    async getNoteStats(noteId) {
        try {
            const note = await prisma.openNote.findUnique({
                where: { id: noteId },
                select: {
                    helpfulCount: true,
                    notHelpfulCount: true,
                    totalRatings: true,
                    helpfulnessRatio: true,
                    isVisible: true,
                    status: true,
                },
            });
            if (!note) {
                throw new Error('Note not found');
            }
            return note;
        }
        catch (error) {
            logger.error('Error getting note stats:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=openNoteService.js.map