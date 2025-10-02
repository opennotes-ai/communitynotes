import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
} from 'discord.js';
import { NoteRating } from '@prisma/client';
import { logger } from '../../shared/utils/logger.js';
import { SourceHandlingService } from './sourceHandlingService.js';
import { CommunityNoteWithRelations } from '../../database/services/communityNoteService.js';

type NoteWithRelations = CommunityNoteWithRelations;

export interface NoteDisplayOptions {
  showRatingButtons?: boolean;
  showAuthor?: boolean;
  showSources?: boolean;
  showRatings?: boolean;
  compact?: boolean;
  viewerId?: string;
}

export class NoteDisplayService {
  private sourceHandlingService: SourceHandlingService;

  constructor() {
    this.sourceHandlingService = new SourceHandlingService();
  }

  /**
   * Creates a rich embed for displaying a community note
   */
  createNoteEmbed(note: NoteWithRelations, options: NoteDisplayOptions = {}): EmbedBuilder {
    const {
      showAuthor = true,
      showSources = true,
      showRatings = true,
      compact = false,
    } = options;

    const embed = new EmbedBuilder()
      .setColor(this.getNoteColor(note.status))
      .setTimestamp(note.submittedAt);

    // Add status indicator and title
    const statusInfo = this.getStatusInfo(note.status);
    embed.setTitle(`${statusInfo.emoji} Community Note ${statusInfo.label}`);

    // Add note content
    const contentPreview = note.content.length > 1000
      ? `${note.content.substring(0, 1000)}...`
      : note.content;

    embed.setDescription(contentPreview);

    // Add classification
    embed.addFields({
      name: '🏷️ Classification',
      value: this.formatClassification(note.classification),
      inline: true,
    });

    // Add confidence score based on ratings
    if (note.totalRatings > 0) {
      const confidenceScore = this.calculateConfidenceScore(note);
      embed.addFields({
        name: '📊 Confidence',
        value: `${confidenceScore.percentage}% (${confidenceScore.label})`,
        inline: true,
      });
    }

    // Add rating stats if not compact
    if (showRatings && !compact) {
      const ratingText = this.formatRatingStats(note);
      embed.addFields({
        name: '👥 Community Ratings',
        value: ratingText,
        inline: false,
      });
    }

    // Add author info if enabled
    if (showAuthor) {
      const authorText = `${note.author.username} (Trust: ${note.author.trustLevel})`;
      embed.addFields({
        name: '✍️ Author',
        value: authorText,
        inline: true,
      });
    }

    // Add sources if present and enabled
    if (showSources && note.sources.length > 0) {
      const sourceFormatting = this.sourceHandlingService.formatSourcesForEmbed(note.sources, compact);
      const sourceSummary = this.sourceHandlingService.createSourceSummary(note.sources);

      embed.addFields({
        name: `🔗 Sources (${sourceSummary})`,
        value: sourceFormatting.value,
        inline: false,
      });
    }

    // Add footer with note ID for reference
    embed.setFooter({
      text: `Note ID: ${note.id} • ${note.totalRatings} ratings`,
    });

    return embed;
  }

  /**
   * Creates action buttons for note rating
   */
  createRatingButtons(noteId: string, userRating?: NoteRating | null): ActionRowBuilder<ButtonBuilder> {
    const helpfulButton = new ButtonBuilder()
      .setCustomId(`note_helpful_${noteId}`)
      .setLabel('Helpful')
      .setEmoji('👍')
      .setStyle(userRating?.helpful === true ? ButtonStyle.Success : ButtonStyle.Secondary);

    const notHelpfulButton = new ButtonBuilder()
      .setCustomId(`note_not_helpful_${noteId}`)
      .setLabel('Not Helpful')
      .setEmoji('👎')
      .setStyle(userRating?.helpful === false ? ButtonStyle.Danger : ButtonStyle.Secondary);

    const viewSourcesButton = new ButtonBuilder()
      .setCustomId(`note_sources_${noteId}`)
      .setLabel('View Sources')
      .setEmoji('🔗')
      .setStyle(ButtonStyle.Primary);

    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(helpfulButton, notHelpfulButton, viewSourcesButton);
  }

  /**
   * Creates a compact summary for multiple notes
   */
  createNoteSummaryEmbed(notes: NoteWithRelations[], messageId: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(Colors.Blue)
      .setTitle('📝 Community Notes Summary')
      .setDescription(`Found ${notes.length} note(s) for this message`);

    // Group notes by status
    const statusGroups = notes.reduce((groups, note) => {
      const status = note.status;
      if (!groups[status]) groups[status] = [];
      groups[status].push(note);
      return groups;
    }, {} as Record<string, NoteWithRelations[]>);

    // Add field for each status group
    Object.entries(statusGroups).forEach(([status, groupNotes]) => {
      const statusInfo = this.getStatusInfo(status);
      const notesList = groupNotes
        .slice(0, 3) // Limit to 3 notes per status
        .map((note, index) => {
          const preview = note.content.substring(0, 100);
          const confidenceScore = this.calculateConfidenceScore(note);
          return `**${index + 1}.** ${preview}${preview.length < note.content.length ? '...' : ''}\n*${confidenceScore.percentage}% confidence • ${note.totalRatings} ratings*`;
        })
        .join('\n\n');

      embed.addFields({
        name: `${statusInfo.emoji} ${statusInfo.label} (${groupNotes.length})`,
        value: notesList || 'No notes',
        inline: false,
      });
    });

    embed.setFooter({
      text: `Use /view-notes to see full details • Message ID: ${messageId}`,
    });

    return embed;
  }

  /**
   * Formats rating statistics for display
   */
  private formatRatingStats(note: NoteWithRelations): string {
    if (note.totalRatings === 0) {
      return 'No ratings yet';
    }

    const helpfulPercentage = Math.round((note.helpfulCount / note.totalRatings) * 100);
    const bars = this.createProgressBar(helpfulPercentage);

    return [
      `${bars} ${helpfulPercentage}% helpful`,
      `👍 ${note.helpfulCount} helpful • 👎 ${note.notHelpfulCount} not helpful`,
      `Total: ${note.totalRatings} ratings`,
    ].join('\n');
  }

  /**
   * Creates a visual progress bar for percentages
   */
  private createProgressBar(percentage: number, length: number = 10): string {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Formats classification with appropriate emoji
   */
  private formatClassification(classification: string): string {
    const classificationMap: Record<string, string> = {
      'misleading': '⚠️ Misleading Information',
      'lacking-context': '📝 Lacks Important Context',
      'disputed': '🔍 Disputed Claims',
      'unsubstantiated': '❓ Unsubstantiated Claims',
    };

    return classificationMap[classification] || `📋 ${classification}`;
  }


  /**
   * Gets status information for display
   */
  private getStatusInfo(status: string): { emoji: string; label: string; description: string } {
    const statusMap: Record<string, { emoji: string; label: string; description: string }> = {
      'pending': {
        emoji: '⏳',
        label: 'Pending Review',
        description: 'This note is being reviewed by the community',
      },
      'crh': {
        emoji: '✅',
        label: 'Currently Rated Helpful',
        description: 'The community finds this note helpful',
      },
      'nrh': {
        emoji: '❌',
        label: 'Not Rated Helpful',
        description: 'The community does not find this note helpful',
      },
      'needs-more-ratings': {
        emoji: '🤔',
        label: 'Needs More Ratings',
        description: 'This note needs more community input',
      },
    };

    return statusMap[status] || {
      emoji: '❓',
      label: 'Unknown Status',
      description: 'Status not recognized',
    };
  }

  /**
   * Gets appropriate color for note status
   */
  private getNoteColor(status: string): number {
    const colorMap: Record<string, number> = {
      'pending': Colors.Yellow,
      'crh': Colors.Green,
      'nrh': Colors.Red,
      'needs-more-ratings': Colors.Orange,
    };

    return colorMap[status] || Colors.Grey;
  }

  /**
   * Calculates confidence score based on ratings
   */
  private calculateConfidenceScore(note: NoteWithRelations): { percentage: number; label: string } {
    if (note.totalRatings === 0) {
      return { percentage: 0, label: 'No Data' };
    }

    // Base confidence on helpfulness ratio and total ratings
    const ratingWeight = Math.min(note.totalRatings / 10, 1); // More ratings = higher confidence
    const helpfulnessScore = note.helpfulnessRatio;
    const confidence = Math.round((helpfulnessScore * ratingWeight) * 100);

    let label: string;
    if (confidence >= 80) label = 'Very High';
    else if (confidence >= 60) label = 'High';
    else if (confidence >= 40) label = 'Medium';
    else if (confidence >= 20) label = 'Low';
    else label = 'Very Low';

    return { percentage: confidence, label };
  }

  /**
   * Determines if a note should be automatically displayed
   */
  shouldAutoDisplayNote(note: NoteWithRelations): boolean {
    // Auto-display criteria:
    // 1. Note is visible (isVisible = true)
    // 2. Status is CRH (Currently Rated Helpful)
    // 3. High confidence score (>= 70%)
    // 4. Minimum number of ratings (>= 3)

    if (!note.isVisible || note.status !== 'crh') {
      return false;
    }

    const confidence = this.calculateConfidenceScore(note);
    return confidence.percentage >= 70 && note.totalRatings >= 3;
  }

  /**
   * Creates a simple text summary for auto-display
   */
  createAutoDisplaySummary(note: NoteWithRelations): string {
    const statusInfo = this.getStatusInfo(note.status);
    const confidence = this.calculateConfidenceScore(note);

    const preview = note.content.length > 200
      ? `${note.content.substring(0, 200)}...`
      : note.content;

    return [
      `${statusInfo.emoji} **Community Note** (${confidence.percentage}% confidence)`,
      '',
      preview,
      '',
      `*${note.helpfulCount} found this helpful • ${note.notHelpfulCount} did not*`,
    ].join('\n');
  }
}