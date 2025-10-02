import { describe, it, expect } from '@jest/globals';
import { SourceHandlingService } from '../sourceHandlingService.js';

describe('SourceHandlingService', () => {
  let service: SourceHandlingService;

  beforeEach(() => {
    service = new SourceHandlingService();
  });

  describe('validateSources', () => {
    it('should validate multiple sources', () => {
      const sources = [
        'https://wikipedia.org/article',
        'https://example.com/page',
        'not-a-url'
      ];
      const result = service.validateSources(sources);
      expect(result).toHaveLength(3);
      expect(result[0].isValid).toBe(true);
      expect(result[1].isValid).toBe(true);
      expect(result[2].isValid).toBe(false);
    });

    it('should handle empty array', () => {
      const result = service.validateSources([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('validateSource', () => {
    it('should validate valid HTTP URL', () => {
      const result = (service as any).validateSource('http://example.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
    });

    it('should validate valid HTTPS URL', () => {
      const result = (service as any).validateSource('https://example.com/path');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
    });

    it('should invalidate malformed URLs', () => {
      const result = (service as any).validateSource('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.domain).toBe('');
    });

    it('should block bit.ly URLs', () => {
      const result = (service as any).validateSource('https://bit.ly/abc123');
      expect(result.isValid).toBe(false);
      expect(result.domain).toBe('bit.ly');
    });

    it('should block tinyurl URLs', () => {
      const result = (service as any).validateSource('https://tinyurl.com/abc');
      expect(result.isValid).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = (service as any).validateSource('  https://example.com  ');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
    });

    it('should handle URLs with www', () => {
      const result = (service as any).validateSource('https://www.example.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('www.example.com');
    });

    it('should handle URLs with query parameters', () => {
      const result = (service as any).validateSource('https://example.com?foo=bar&baz=qux');
      expect(result.isValid).toBe(true);
    });

    it('should handle URLs with fragments', () => {
      const result = (service as any).validateSource('https://example.com/path#section');
      expect(result.isValid).toBe(true);
    });
  });

  describe('isValidUrl', () => {
    it('should validate proper HTTP URLs', () => {
      expect((service as any).isValidUrl('http://example.com')).toBe(true);
    });

    it('should validate proper HTTPS URLs', () => {
      expect((service as any).isValidUrl('https://example.com')).toBe(true);
    });

    it('should reject URLs without protocol', () => {
      expect((service as any).isValidUrl('example.com')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect((service as any).isValidUrl('')).toBe(false);
    });

    it('should reject FTP URLs', () => {
      expect((service as any).isValidUrl('ftp://example.com')).toBe(false);
    });

    it('should validate URLs with paths', () => {
      expect((service as any).isValidUrl('https://example.com/path/to/resource')).toBe(true);
    });

    it('should validate URLs with query strings', () => {
      expect((service as any).isValidUrl('https://example.com?query=value')).toBe(true);
    });
  });

  describe('getTrustIndicator', () => {
    it('should return green indicator for trusted domain', () => {
      const indicator = (service as any).getTrustIndicator('wikipedia.org');
      expect(indicator).toBe('🟢');
    });

    it('should return green indicator for subdomain of trusted domain', () => {
      const indicator = (service as any).getTrustIndicator('en.wikipedia.org');
      expect(indicator).toBe('🟢');
    });

    it('should return blue indicator for non-trusted domain', () => {
      const indicator = (service as any).getTrustIndicator('example.com');
      expect(indicator).toBe('🔵');
    });

    it('should return green indicator for .gov domains', () => {
      const indicator = (service as any).getTrustIndicator('cdc.gov');
      expect(indicator).toBe('🟢');
    });

    it('should return green indicator for .edu domains', () => {
      const indicator = (service as any).getTrustIndicator('mit.edu');
      expect(indicator).toBe('🟢');
    });
  });

  describe('analyzeSourceTrust', () => {
    it('should count trusted and standard sources correctly', () => {
      const sources = [
        { url: 'https://wikipedia.org', domain: 'wikipedia.org', isValid: true },
        { url: 'https://reuters.com', domain: 'reuters.com', isValid: true },
        { url: 'https://example.com', domain: 'example.com', isValid: true },
      ];
      const result = (service as any).analyzeSourceTrust(sources);
      expect(result.trustedCount).toBe(2);
      expect(result.standardCount).toBe(1);
      expect(result.trustScore).toBe(67);
    });

    it('should calculate 100% trust score for all trusted sources', () => {
      const sources = [
        { url: 'https://wikipedia.org', domain: 'wikipedia.org', isValid: true },
        { url: 'https://reuters.com', domain: 'reuters.com', isValid: true },
      ];
      const result = (service as any).analyzeSourceTrust(sources);
      expect(result.trustScore).toBe(100);
    });

    it('should calculate 0% trust score for no trusted sources', () => {
      const sources = [
        { url: 'https://example.com', domain: 'example.com', isValid: true },
        { url: 'https://test.com', domain: 'test.com', isValid: true },
      ];
      const result = (service as any).analyzeSourceTrust(sources);
      expect(result.trustScore).toBe(0);
    });

    it('should handle empty sources array', () => {
      const result = (service as any).analyzeSourceTrust([]);
      expect(result.trustScore).toBe(0);
      expect(result.trustedCount).toBe(0);
      expect(result.standardCount).toBe(0);
    });
  });

  describe('getSourceQualityMetrics', () => {
    it('should calculate metrics for valid sources', () => {
      const sources = [
        'https://wikipedia.org/article',
        'https://reuters.com/news',
        'https://example.com/page'
      ];
      const result = service.getSourceQualityMetrics(sources);
      expect(result.totalSources).toBe(3);
      expect(result.validSources).toBe(3);
      expect(result.trustedSources).toBe(2);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.qualityLabel).toBeTruthy();
    });

    it('should give higher scores for more sources', () => {
      const oneSources = ['https://example.com'];
      const threeSources = [
        'https://example.com',
        'https://test.com',
        'https://site.com'
      ];
      const result1 = service.getSourceQualityMetrics(oneSources);
      const result3 = service.getSourceQualityMetrics(threeSources);
      expect(result3.qualityScore).toBeGreaterThan(result1.qualityScore);
    });

    it('should give higher scores for trusted sources', () => {
      const untrusted = ['https://example.com', 'https://test.com'];
      const trusted = ['https://wikipedia.org', 'https://reuters.com'];
      const result1 = service.getSourceQualityMetrics(untrusted);
      const result2 = service.getSourceQualityMetrics(trusted);
      expect(result2.qualityScore).toBeGreaterThan(result1.qualityScore);
    });

    it('should label Excellent for high scores', () => {
      const sources = [
        'https://wikipedia.org/1',
        'https://reuters.com/2',
        'https://bbc.com/3',
        'https://apnews.com/4'
      ];
      const result = service.getSourceQualityMetrics(sources);
      expect(result.qualityLabel).toBe('Excellent');
    });

    it('should handle invalid sources', () => {
      const sources = ['not-a-url', 'https://bit.ly/abc'];
      const result = service.getSourceQualityMetrics(sources);
      expect(result.validSources).toBe(0);
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty sources', () => {
      const result = service.getSourceQualityMetrics([]);
      expect(result.totalSources).toBe(0);
      expect(result.validSources).toBe(0);
      expect(result.trustedSources).toBe(0);
    });
  });

  describe('formatSourcesForEmbed', () => {
    it('should format valid sources', () => {
      const sources = ['https://wikipedia.org/article', 'https://example.com/page'];
      const result = service.formatSourcesForEmbed(sources);
      expect(result.value).toContain('wikipedia.org');
      expect(result.value).toContain('example.com');
      expect(result.truncated).toBe(false);
    });

    it('should return message for empty sources', () => {
      const result = service.formatSourcesForEmbed([]);
      expect(result.value).toBe('No sources provided');
      expect(result.truncated).toBe(false);
    });

    it('should truncate large source lists', () => {
      const sources = Array(15).fill('https://example.com/page');
      const result = service.formatSourcesForEmbed(sources);
      expect(result.truncated).toBe(true);
      expect(result.value).toContain('more sources');
    });

    it('should use compact mode with fewer sources', () => {
      const sources = Array(10).fill('https://example.com/page');
      const result = service.formatSourcesForEmbed(sources, true);
      expect(result.truncated).toBe(true);
      expect(result.value).toContain('more sources');
    });

    it('should mark invalid sources', () => {
      const sources = ['not-a-url'];
      const result = service.formatSourcesForEmbed(sources);
      expect(result.value).toContain('Invalid/Blocked URL');
    });

    it('should show trust indicators', () => {
      const sources = ['https://wikipedia.org/article'];
      const result = service.formatSourcesForEmbed(sources);
      expect(result.value).toContain('🟢');
    });
  });

  describe('createSourceSummary', () => {
    it('should return message for no sources', () => {
      const result = service.createSourceSummary([]);
      expect(result).toBe('No sources');
    });

    it('should create summary for sources', () => {
      const sources = [
        'https://wikipedia.org/article',
        'https://example.com/page'
      ];
      const result = service.createSourceSummary(sources);
      expect(result).toContain('source');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
