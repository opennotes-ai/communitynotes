export { prisma, connectDatabase, disconnectDatabase, healthCheck } from './client.js';

export {
  UserService,
  ServerService,
  MessageService,
  NoteRequestService,
  OpenNoteService,
  NoteRatingService,
  RequestAggregationService,
  RateLimitingService,
} from './services/index.js';

// Create service instances
import {
  UserService,
  ServerService,
  MessageService,
  NoteRequestService,
  OpenNoteService,
  NoteRatingService,
  RequestAggregationService,
  RateLimitingService,
} from './services/index.js';

export const userService = new UserService();
export const serverService = new ServerService();
export const messageService = new MessageService();
export const noteRequestService = new NoteRequestService();
export const communityNoteService = new OpenNoteService();
export const noteRatingService = new NoteRatingService();
export const requestAggregationService = new RequestAggregationService();
export const rateLimitingService = new RateLimitingService();