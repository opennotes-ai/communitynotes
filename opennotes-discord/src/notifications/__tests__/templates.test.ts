import { describe, it, expect } from '@jest/globals';
import {
  NewRequestsThresholdTemplate,
  NotePublishedTemplate,
  NoteRatingsReceivedTemplate,
  NoteStatusChangedTemplate,
  ContributorMilestoneTemplate,
  notificationTemplates
} from '../templates.js';
import { NotificationType } from '../types.js';

describe('NewRequestsThresholdTemplate', () => {
  const template = new NewRequestsThresholdTemplate();

  it('should return correct notification type', () => {
    expect(template.type).toBe(NotificationType.NEW_REQUESTS_THRESHOLD_MET);
  });

  it('should generate title with request count', () => {
    const title = template.getTitle({ requestCount: 5 });
    expect(title).toContain('5 requests');
    expect(title).toContain('New Note Requests Available');
  });

  it('should generate description with request count', () => {
    const description = template.getDescription({ requestCount: 3 });
    expect(description).toContain('3 note requests');
    expect(description).toContain('contributor attention');
  });

  it('should return blue color for embed', () => {
    expect(template.getEmbedColor()).toBe(0x3498db);
  });

  it('should enable batching', () => {
    expect(template.shouldBatch()).toBe(true);
  });

  it('should generate batch key with server ID', () => {
    const batchKey = template.getBatchKey({ serverId: 'server123' });
    expect(batchKey).toBe('threshold_met_server123');
  });
});

describe('NotePublishedTemplate', () => {
  const template = new NotePublishedTemplate();

  it('should return correct notification type', () => {
    expect(template.type).toBe(NotificationType.NOTE_PUBLISHED_ON_REQUEST);
  });

  it('should generate title for published note', () => {
    const title = template.getTitle({});
    expect(title).toContain('Note Request Has Been Answered');
  });

  it('should generate description with classification', () => {
    const description = template.getDescription({ noteClassification: 'misleading' });
    expect(description).toContain('misleading');
    expect(description).toContain('Open Note has been published');
  });

  it('should return green color for embed', () => {
    expect(template.getEmbedColor()).toBe(0x2ecc71);
  });

  it('should not enable batching', () => {
    expect(template.shouldBatch()).toBe(false);
  });

  it('should return empty batch key', () => {
    const batchKey = template.getBatchKey({});
    expect(batchKey).toBe('');
  });
});

describe('NoteRatingsReceivedTemplate', () => {
  const template = new NoteRatingsReceivedTemplate();

  it('should return correct notification type', () => {
    expect(template.type).toBe(NotificationType.NOTE_RECEIVED_RATINGS);
  });

  it('should generate title with single rating', () => {
    const title = template.getTitle({ helpfulCount: 1, notHelpfulCount: 0 });
    expect(title).toContain('1 New Rating');
    expect(title).not.toContain('Ratings');
  });

  it('should generate title with multiple ratings', () => {
    const title = template.getTitle({ helpfulCount: 3, notHelpfulCount: 2 });
    expect(title).toContain('5 New Ratings');
  });

  it('should generate description with rating breakdown', () => {
    const description = template.getDescription({
      helpfulCount: 7,
      notHelpfulCount: 3,
      helpfulnessRatio: 0.7
    });
    expect(description).toContain('7 helpful');
    expect(description).toContain('3 not helpful');
    expect(description).toContain('70% helpful');
  });

  it('should calculate percentage correctly', () => {
    const description = template.getDescription({
      helpfulCount: 1,
      notHelpfulCount: 1,
      helpfulnessRatio: 0.5
    });
    expect(description).toContain('50% helpful');
  });

  it('should return orange color for embed', () => {
    expect(template.getEmbedColor()).toBe(0xf39c12);
  });

  it('should enable batching', () => {
    expect(template.shouldBatch()).toBe(true);
  });

  it('should generate batch key with note ID', () => {
    const batchKey = template.getBatchKey({ noteId: 'note456' });
    expect(batchKey).toBe('ratings_note456');
  });
});

describe('NoteStatusChangedTemplate', () => {
  const template = new NoteStatusChangedTemplate();

  it('should return correct notification type', () => {
    expect(template.type).toBe(NotificationType.NOTE_STATUS_CHANGED);
  });

  it('should generate title for CRH status', () => {
    const title = template.getTitle({ newStatus: 'crh' });
    expect(title).toContain('Note Status Changed');
  });

  it('should generate description with status change', () => {
    const description = template.getDescription({
      oldStatus: 'pending',
      newStatus: 'crh'
    });
    expect(description).toContain('pending');
    expect(description).toContain('crh');
    expect(description).toContain('currently rated helpful');
  });

  it('should include appropriate status description for CRH', () => {
    const description = template.getDescription({
      oldStatus: 'pending',
      newStatus: 'crh'
    });
    expect(description).toContain('shown to users');
  });

  it('should include appropriate status description for NRH', () => {
    const description = template.getDescription({
      oldStatus: 'crh',
      newStatus: 'nrh'
    });
    expect(description).toContain('not currently rated helpful');
  });

  it('should include appropriate status description for needs-more-ratings', () => {
    const description = template.getDescription({
      oldStatus: 'pending',
      newStatus: 'needs-more-ratings'
    });
    expect(description).toContain('needs more ratings');
  });

  it('should not enable batching', () => {
    expect(template.shouldBatch()).toBe(false);
  });

  it('should return empty batch key', () => {
    const batchKey = template.getBatchKey({});
    expect(batchKey).toBe('');
  });
});

describe('ContributorMilestoneTemplate', () => {
  const template = new ContributorMilestoneTemplate();

  it('should return correct notification type', () => {
    expect(template.type).toBe(NotificationType.CONTRIBUTOR_MILESTONE_REACHED);
  });

  it('should generate title with milestone name', () => {
    const title = template.getTitle({ milestoneName: 'First Note' });
    expect(title).toContain('Milestone Reached');
    expect(title).toContain('First Note');
  });

  it('should generate description with milestone details', () => {
    const description = template.getDescription({
      milestoneName: '100 Notes',
      metric: 'notes created',
      value: 100
    });
    expect(description).toContain('100 Notes');
    expect(description).toContain('notes created');
    expect(description).toContain('100');
    expect(description).toContain('Thank you for contributing');
  });

  it('should return purple color for embed', () => {
    expect(template.getEmbedColor()).toBe(0x9b59b6);
  });

  it('should not enable batching', () => {
    expect(template.shouldBatch()).toBe(false);
  });

  it('should return empty batch key', () => {
    const batchKey = template.getBatchKey({});
    expect(batchKey).toBe('');
  });
});

describe('notificationTemplates', () => {
  it('should contain all notification types', () => {
    expect(notificationTemplates.size).toBe(5);
    expect(notificationTemplates.has(NotificationType.NEW_REQUESTS_THRESHOLD_MET)).toBe(true);
    expect(notificationTemplates.has(NotificationType.NOTE_PUBLISHED_ON_REQUEST)).toBe(true);
    expect(notificationTemplates.has(NotificationType.NOTE_RECEIVED_RATINGS)).toBe(true);
    expect(notificationTemplates.has(NotificationType.NOTE_STATUS_CHANGED)).toBe(true);
    expect(notificationTemplates.has(NotificationType.CONTRIBUTOR_MILESTONE_REACHED)).toBe(true);
  });

  it('should map correct template instances', () => {
    const thresholdTemplate = notificationTemplates.get(NotificationType.NEW_REQUESTS_THRESHOLD_MET);
    expect(thresholdTemplate).toBeInstanceOf(NewRequestsThresholdTemplate);

    const publishedTemplate = notificationTemplates.get(NotificationType.NOTE_PUBLISHED_ON_REQUEST);
    expect(publishedTemplate).toBeInstanceOf(NotePublishedTemplate);

    const ratingsTemplate = notificationTemplates.get(NotificationType.NOTE_RECEIVED_RATINGS);
    expect(ratingsTemplate).toBeInstanceOf(NoteRatingsReceivedTemplate);

    const statusTemplate = notificationTemplates.get(NotificationType.NOTE_STATUS_CHANGED);
    expect(statusTemplate).toBeInstanceOf(NoteStatusChangedTemplate);

    const milestoneTemplate = notificationTemplates.get(NotificationType.CONTRIBUTOR_MILESTONE_REACHED);
    expect(milestoneTemplate).toBeInstanceOf(ContributorMilestoneTemplate);
  });
});
