import { EmbedBuilder, Colors } from 'discord.js';
import { logger } from '../../shared/utils/logger.js';
export class SourceHandlingService {
    static TRUSTED_DOMAINS = [
        'wikipedia.org',
        'reuters.com',
        'apnews.com',
        'bbc.com',
        'npr.org',
        'snopes.com',
        'factcheck.org',
        'politifact.com',
        'gov',
        'edu',
        'nih.gov',
        'cdc.gov',
        'who.int',
    ];
    static BLOCKED_DOMAINS = [
        'bit.ly',
        'tinyurl.com',
        't.co',
        'goo.gl',
        'ow.ly',
        'short.link',
    ];
    static MAX_SOURCES_DISPLAY = 10;
    static URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    /**
     * Validates and parses source URLs
     */
    validateSources(sources) {
        return sources.map(source => this.validateSource(source));
    }
    /**
     * Validates a single source URL
     */
    validateSource(source) {
        const trimmedSource = source.trim();
        // Check if it's a valid URL
        if (!this.isValidUrl(trimmedSource)) {
            return {
                url: trimmedSource,
                domain: '',
                isValid: false,
            };
        }
        try {
            const url = new URL(trimmedSource);
            const domain = url.hostname.toLowerCase();
            // Check for blocked domains
            const isBlocked = SourceHandlingService.BLOCKED_DOMAINS.some(blockedDomain => domain.includes(blockedDomain));
            if (isBlocked) {
                return {
                    url: trimmedSource,
                    domain,
                    isValid: false,
                };
            }
            return {
                url: trimmedSource,
                domain,
                isValid: true,
            };
        }
        catch (error) {
            logger.warn('Invalid URL in source validation', {
                source: trimmedSource,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return {
                url: trimmedSource,
                domain: '',
                isValid: false,
            };
        }
    }
    /**
     * Creates a formatted display of sources for embeds
     */
    formatSourcesForEmbed(sources, compact = false) {
        if (sources.length === 0) {
            return { value: 'No sources provided', truncated: false };
        }
        const validatedSources = this.validateSources(sources);
        const maxDisplay = compact ? 3 : SourceHandlingService.MAX_SOURCES_DISPLAY;
        const displaySources = validatedSources.slice(0, maxDisplay);
        const formatted = displaySources.map((sourceInfo, index) => {
            const number = index + 1;
            if (!sourceInfo.isValid) {
                return `${number}. ❌ Invalid/Blocked URL`;
            }
            const trustIndicator = this.getTrustIndicator(sourceInfo.domain);
            const domainDisplay = sourceInfo.domain || 'Unknown domain';
            return `${number}. ${trustIndicator} [${domainDisplay}](${sourceInfo.url})`;
        }).join('\n');
        const truncated = sources.length > maxDisplay;
        const finalValue = truncated
            ? `${formatted}\n*...and ${sources.length - maxDisplay} more sources*`
            : formatted;
        return { value: finalValue, truncated };
    }
    /**
     * Creates a detailed source preview embed
     */
    createSourcePreviewEmbed(sources, noteId) {
        const embed = new EmbedBuilder()
            .setColor(Colors.Blue)
            .setTitle('🔗 Source Verification')
            .setDescription('Review the sources provided for this open note')
            .setFooter({ text: `Note ID: ${noteId}` });
        if (sources.length === 0) {
            embed.addFields({
                name: 'No Sources',
                value: 'This note does not include any source links.',
                inline: false,
            });
            return embed;
        }
        const validatedSources = this.validateSources(sources);
        const validSources = validatedSources.filter(s => s.isValid);
        const invalidSources = validatedSources.filter(s => !s.isValid);
        // Add valid sources
        if (validSources.length > 0) {
            const trustData = this.analyzeSourceTrust(validSources);
            embed.addFields({
                name: `✅ Valid Sources (${validSources.length})`,
                value: this.formatValidSources(validSources),
                inline: false,
            });
            embed.addFields({
                name: '📊 Source Analysis',
                value: [
                    `**Trusted domains:** ${trustData.trustedCount}`,
                    `**Standard domains:** ${trustData.standardCount}`,
                    `**Trust score:** ${trustData.trustScore}%`,
                ].join('\n'),
                inline: true,
            });
        }
        // Add invalid sources
        if (invalidSources.length > 0) {
            embed.addFields({
                name: `❌ Invalid/Blocked Sources (${invalidSources.length})`,
                value: invalidSources.map((source, index) => `${index + 1}. ${source.url.length > 50 ? source.url.substring(0, 50) + '...' : source.url}`).join('\n'),
                inline: false,
            });
        }
        return embed;
    }
    /**
     * Gets trust indicator emoji for a domain
     */
    getTrustIndicator(domain) {
        const isTrusted = SourceHandlingService.TRUSTED_DOMAINS.some(trustedDomain => domain.includes(trustedDomain));
        return isTrusted ? '🟢' : '🔵';
    }
    /**
     * Analyzes trust level of sources
     */
    analyzeSourceTrust(sources) {
        let trustedCount = 0;
        let standardCount = 0;
        for (const source of sources) {
            const isTrusted = SourceHandlingService.TRUSTED_DOMAINS.some(trustedDomain => source.domain.includes(trustedDomain));
            if (isTrusted) {
                trustedCount++;
            }
            else {
                standardCount++;
            }
        }
        const total = sources.length;
        const trustScore = total > 0 ? Math.round((trustedCount / total) * 100) : 0;
        return { trustedCount, standardCount, trustScore };
    }
    /**
     * Formats valid sources for display
     */
    formatValidSources(sources) {
        const maxSources = 15; // Discord field limit consideration
        const displaySources = sources.slice(0, maxSources);
        const formatted = displaySources.map((source, index) => {
            const trustIndicator = this.getTrustIndicator(source.domain);
            return `${index + 1}. ${trustIndicator} [${source.domain}](${source.url})`;
        }).join('\n');
        if (sources.length > maxSources) {
            return `${formatted}\n*...and ${sources.length - maxSources} more*`;
        }
        return formatted;
    }
    /**
     * Validates URL format
     */
    isValidUrl(url) {
        return SourceHandlingService.URL_REGEX.test(url);
    }
    /**
     * Gets source quality metrics for a note
     */
    getSourceQualityMetrics(sources) {
        const validatedSources = this.validateSources(sources);
        const validSources = validatedSources.filter(s => s.isValid);
        const trustData = this.analyzeSourceTrust(validSources);
        // Calculate quality score based on:
        // - Number of sources (more is better, up to a point)
        // - Percentage of trusted sources
        // - Overall validity
        const sourceCountScore = Math.min(sources.length * 20, 60); // Max 60 for 3+ sources
        const trustScore = trustData.trustScore * 0.3; // Max 30
        const validityScore = validSources.length / sources.length * 10; // Max 10
        const qualityScore = Math.round(sourceCountScore + trustScore + validityScore);
        let qualityLabel;
        if (qualityScore >= 80)
            qualityLabel = 'Excellent';
        else if (qualityScore >= 60)
            qualityLabel = 'Good';
        else if (qualityScore >= 40)
            qualityLabel = 'Fair';
        else if (qualityScore >= 20)
            qualityLabel = 'Poor';
        else
            qualityLabel = 'Very Poor';
        return {
            totalSources: sources.length,
            validSources: validSources.length,
            trustedSources: trustData.trustedCount,
            qualityScore,
            qualityLabel,
        };
    }
    /**
     * Creates a compact source summary for note displays
     */
    createSourceSummary(sources) {
        if (sources.length === 0) {
            return 'No sources';
        }
        const metrics = this.getSourceQualityMetrics(sources);
        return [
            `**${metrics.totalSources}** sources`,
            `(${metrics.trustedSources} trusted)`,
            `Quality: ${metrics.qualityLabel}`,
        ].join(' • ');
    }
}
//# sourceMappingURL=sourceHandlingService.js.map