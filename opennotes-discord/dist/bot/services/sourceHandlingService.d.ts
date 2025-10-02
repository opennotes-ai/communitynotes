import { EmbedBuilder } from 'discord.js';
export interface SourceInfo {
    url: string;
    title?: string;
    description?: string;
    domain: string;
    favicon?: string;
    isValid: boolean;
}
export interface SourcePreview {
    embed: EmbedBuilder;
    isValid: boolean;
    error?: string;
}
export declare class SourceHandlingService {
    private static readonly TRUSTED_DOMAINS;
    private static readonly BLOCKED_DOMAINS;
    private static readonly MAX_SOURCES_DISPLAY;
    private static readonly URL_REGEX;
    /**
     * Validates and parses source URLs
     */
    validateSources(sources: string[]): SourceInfo[];
    /**
     * Validates a single source URL
     */
    private validateSource;
    /**
     * Creates a formatted display of sources for embeds
     */
    formatSourcesForEmbed(sources: string[], compact?: boolean): {
        value: string;
        truncated: boolean;
    };
    /**
     * Creates a detailed source preview embed
     */
    createSourcePreviewEmbed(sources: string[], noteId: string): EmbedBuilder;
    /**
     * Gets trust indicator emoji for a domain
     */
    private getTrustIndicator;
    /**
     * Analyzes trust level of sources
     */
    private analyzeSourceTrust;
    /**
     * Formats valid sources for display
     */
    private formatValidSources;
    /**
     * Validates URL format
     */
    private isValidUrl;
    /**
     * Gets source quality metrics for a note
     */
    getSourceQualityMetrics(sources: string[]): {
        totalSources: number;
        validSources: number;
        trustedSources: number;
        qualityScore: number;
        qualityLabel: string;
    };
    /**
     * Creates a compact source summary for note displays
     */
    createSourceSummary(sources: string[]): string;
}
//# sourceMappingURL=sourceHandlingService.d.ts.map