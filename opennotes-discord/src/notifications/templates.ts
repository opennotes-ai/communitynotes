import { NotificationType, NotificationTemplate } from './types.js';

export class NewRequestsThresholdTemplate implements NotificationTemplate {
  type = NotificationType.NEW_REQUESTS_THRESHOLD_MET;

  getTitle(data: Record<string, any>): string {
    return `📝 New Note Requests Available (${data.requestCount} requests)`;
  }

  getDescription(data: Record<string, any>): string {
    return `A message has reached ${data.requestCount} note requests and needs contributor attention. Your expertise in this area would be valuable!`;
  }

  getEmbedColor(): number {
    return 0x3498db; // Blue
  }

  shouldBatch(): boolean {
    return true;
  }

  getBatchKey(data: Record<string, any>): string {
    return `threshold_met_${data.serverId}`;
  }
}

export class NotePublishedTemplate implements NotificationTemplate {
  type = NotificationType.NOTE_PUBLISHED_ON_REQUEST;

  getTitle(data: Record<string, any>): string {
    return `✅ Your Note Request Has Been Answered`;
  }

  getDescription(data: Record<string, any>): string {
    return `An Open Note has been published for a message you requested context for. The note provides: ${data.noteClassification}`;
  }

  getEmbedColor(): number {
    return 0x2ecc71; // Green
  }

  shouldBatch(): boolean {
    return false;
  }

  getBatchKey(data: Record<string, any>): string {
    return '';
  }
}

export class NoteRatingsReceivedTemplate implements NotificationTemplate {
  type = NotificationType.NOTE_RECEIVED_RATINGS;

  getTitle(data: Record<string, any>): string {
    const { helpfulCount, notHelpfulCount } = data;
    const total = helpfulCount + notHelpfulCount;
    return `📊 Your Note Received ${total} New Rating${total > 1 ? 's' : ''}`;
  }

  getDescription(data: Record<string, any>): string {
    const { helpfulCount, notHelpfulCount, helpfulnessRatio } = data;
    const total = helpfulCount + notHelpfulCount;
    const percentage = Math.round(helpfulnessRatio * 100);
    return `Your Open Note has received ${total} new rating${total > 1 ? 's' : ''}: ${helpfulCount} helpful, ${notHelpfulCount} not helpful (${percentage}% helpful overall)`;
  }

  getEmbedColor(): number {
    return 0xf39c12; // Orange
  }

  shouldBatch(): boolean {
    return true;
  }

  getBatchKey(data: Record<string, any>): string {
    return `ratings_${data.noteId}`;
  }
}

export class NoteStatusChangedTemplate implements NotificationTemplate {
  type = NotificationType.NOTE_STATUS_CHANGED;

  getTitle(data: Record<string, any>): string {
    const statusEmoji = this.getStatusEmoji(data.newStatus);
    return `${statusEmoji} Your Note Status Changed`;
  }

  getDescription(data: Record<string, any>): string {
    const { oldStatus, newStatus } = data;
    return `Your Open Note status changed from "${oldStatus}" to "${newStatus}". ${this.getStatusDescription(newStatus)}`;
  }

  getEmbedColor(): number {
    const { newStatus } = arguments[0];
    switch (newStatus) {
      case 'crh': return 0x2ecc71; // Green for currently rated helpful
      case 'nrh': return 0xe74c3c; // Red for needs more ratings
      default: return 0xf39c12; // Orange for other statuses
    }
  }

  shouldBatch(): boolean {
    return false;
  }

  getBatchKey(data: Record<string, any>): string {
    return '';
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'crh': return '✅';
      case 'nrh': return '❌';
      case 'needs-more-ratings': return '⏳';
      default: return '📋';
    }
  }

  private getStatusDescription(status: string): string {
    switch (status) {
      case 'crh': return 'Your note is now currently rated helpful and may be shown to users.';
      case 'nrh': return 'Your note is not currently rated helpful. Consider revising or adding more sources.';
      case 'needs-more-ratings': return 'Your note needs more ratings to determine its helpfulness.';
      default: return '';
    }
  }
}

export class ContributorMilestoneTemplate implements NotificationTemplate {
  type = NotificationType.CONTRIBUTOR_MILESTONE_REACHED;

  getTitle(data: Record<string, any>): string {
    return `🎉 Milestone Reached: ${data.milestoneName}`;
  }

  getDescription(data: Record<string, any>): string {
    const { milestoneName, metric, value } = data;
    return `Congratulations! You've reached a new milestone: ${milestoneName}. Your ${metric} is now ${value}. Thank you for contributing to Open Notes!`;
  }

  getEmbedColor(): number {
    return 0x9b59b6; // Purple
  }

  shouldBatch(): boolean {
    return false;
  }

  getBatchKey(data: Record<string, any>): string {
    return '';
  }
}

export const notificationTemplates: Map<NotificationType, NotificationTemplate> = new Map([
  [NotificationType.NEW_REQUESTS_THRESHOLD_MET, new NewRequestsThresholdTemplate()],
  [NotificationType.NOTE_PUBLISHED_ON_REQUEST, new NotePublishedTemplate()],
  [NotificationType.NOTE_RECEIVED_RATINGS, new NoteRatingsReceivedTemplate()],
  [NotificationType.NOTE_STATUS_CHANGED, new NoteStatusChangedTemplate()],
  [NotificationType.CONTRIBUTOR_MILESTONE_REACHED, new ContributorMilestoneTemplate()],
]);