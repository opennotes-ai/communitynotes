export enum NotificationType {
  NEW_REQUESTS_THRESHOLD_MET = 'new_requests_threshold_met',
  NOTE_PUBLISHED_ON_REQUEST = 'note_published_on_request',
  NOTE_RECEIVED_RATINGS = 'note_received_ratings',
  NOTE_STATUS_CHANGED = 'note_status_changed',
  CONTRIBUTOR_MILESTONE_REACHED = 'contributor_milestone_reached'
}

export enum NotificationPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4
}

export enum NotificationMethod {
  DISCORD_DM = 'discord_dm',
  CHANNEL_MENTION = 'channel_mention'
}

export interface NotificationPreferences {
  userId: string;
  newRequestsThreshold: boolean;
  notePublishedOnRequest: boolean;
  noteReceivedRatings: boolean;
  noteStatusChanged: boolean;
  contributorMilestones: boolean;
  batchingEnabled: boolean;
  batchingInterval: number; // minutes
  methods: NotificationMethod[];
  mutedUntil?: Date;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  userId: string;
  priority: NotificationPriority;
  data: Record<string, any>;
  createdAt: Date;
  scheduledFor?: Date;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'batched';
}

export interface NotificationTemplate {
  type: NotificationType;
  getTitle(data: Record<string, any>): string;
  getDescription(data: Record<string, any>): string;
  getEmbedColor(): number;
  shouldBatch(): boolean;
  getBatchKey(data: Record<string, any>): string;
}

export interface BatchedNotification {
  userId: string;
  type: NotificationType;
  batchKey: string;
  notifications: NotificationData[];
  createdAt: Date;
  scheduledFor: Date;
}