import { Router } from 'express';
import { analyticsService, reportGenerator } from '../../analytics/index.js';
import { VerificationService } from '../../verification/VerificationService.js';
import { VerificationMiddleware } from '../../verification/VerificationMiddleware.js';
import { logger } from '../../shared/utils/logger.js';
import type { AnalyticsFilter } from '../../analytics/types.js';

export function createAnalyticsRoutes(
  verificationService: VerificationService,
  verificationMiddleware: VerificationMiddleware
): Router {
  const router = Router();

  router.use(verificationMiddleware.requireVerification());

  router.get('/conversion', async (req, res) => {
    try {
      const filter = parseAnalyticsFilter(req.query);
      const metrics = await analyticsService.getConversionMetrics(filter);
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting conversion metrics:', error);
      res.status(500).json({ error: 'Failed to get conversion metrics' });
    }
  });

  router.get('/engagement', async (req, res) => {
    try {
      const filter = parseAnalyticsFilter(req.query);
      const metrics = await analyticsService.getEngagementMetrics(filter);
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting engagement metrics:', error);
      res.status(500).json({ error: 'Failed to get engagement metrics' });
    }
  });

  router.get('/effectiveness', async (req, res) => {
    try {
      const filter = parseAnalyticsFilter(req.query);
      const metrics = await analyticsService.getNoteEffectiveness(filter);
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting note effectiveness metrics:', error);
      res.status(500).json({ error: 'Failed to get note effectiveness metrics' });
    }
  });

  router.get('/performance', async (req, res) => {
    try {
      const filter = parseAnalyticsFilter(req.query);
      const metrics = await analyticsService.getSystemPerformance(filter);
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting system performance metrics:', error);
      res.status(500).json({ error: 'Failed to get system performance metrics' });
    }
  });

  router.get('/trends', async (req, res) => {
    try {
      const filter = parseAnalyticsFilter(req.query);
      const trends = await analyticsService.analyzeTrends(filter);
      res.json(trends);
    } catch (error) {
      logger.error('Error analyzing trends:', error);
      res.status(500).json({ error: 'Failed to analyze trends' });
    }
  });

  router.post('/report', async (req, res) => {
    try {
      const { title, ...filterData } = req.body;
      const filter = parseAnalyticsFilter(filterData);

      const report = await analyticsService.generateReport(filter, title);

      res.json({
        reportId: report.id,
        title: report.title,
        generatedAt: report.generatedAt,
        downloadUrls: {
          json: `/api/analytics/report/${report.id}/download/json`,
          csv: `/api/analytics/report/${report.id}/download/csv`,
          pdf: `/api/analytics/report/${report.id}/download/pdf`
        }
      });
    } catch (error) {
      logger.error('Error generating analytics report:', error);
      res.status(500).json({ error: 'Failed to generate analytics report' });
    }
  });

  router.get('/report/:reportId', async (req, res) => {
    try {
      const { reportId } = req.params;

      res.json({
        message: 'Report generated',
        reportId,
        downloadUrls: {
          json: `/api/analytics/report/${reportId}/download/json`,
          csv: `/api/analytics/report/${reportId}/download/csv`,
          pdf: `/api/analytics/report/${reportId}/download/pdf`
        }
      });
    } catch (error) {
      logger.error('Error getting analytics report:', error);
      res.status(500).json({ error: 'Failed to get analytics report' });
    }
  });

  router.post('/report/:reportId/export', async (req, res) => {
    try {
      const { reportId } = req.params;
      const { format } = req.body;

      if (!['pdf', 'csv', 'json'].includes(format)) {
        return res.status(400).json({ error: 'Invalid export format' });
      }

      const filter = parseAnalyticsFilter(req.body);
      const report = await analyticsService.generateReport(filter, `Export Report ${reportId}`);

      let filepath: string;
      switch (format) {
        case 'pdf':
          filepath = await reportGenerator.generatePDF(report);
          break;
        case 'csv':
          filepath = await reportGenerator.generateCSV(report);
          break;
        case 'json':
          filepath = await reportGenerator.generateJSON(report);
          break;
        default:
          throw new Error('Unsupported format');
      }

      res.json({
        success: true,
        downloadUrl: `/api/analytics/report/${reportId}/download/${format}`,
        format
      });
    } catch (error) {
      logger.error('Error exporting analytics report:', error);
      res.status(500).json({ error: 'Failed to export analytics report' });
    }
  });

  router.get('/report/:reportId/download/:format', async (req, res) => {
    try {
      const { reportId, format } = req.params;

      if (!['pdf', 'csv', 'json'].includes(format)) {
        return res.status(400).json({ error: 'Invalid download format' });
      }

      const filename = `${reportId}.${format}`;
      const filepath = `reports/${filename}`;

      res.download(filepath, filename, (err) => {
        if (err) {
          logger.error('Error downloading report:', err);
          res.status(404).json({ error: 'Report not found' });
        }
      });
    } catch (error) {
      logger.error('Error downloading analytics report:', error);
      res.status(500).json({ error: 'Failed to download analytics report' });
    }
  });

  router.get('/server/:serverId/overview', async (req, res) => {
    try {
      const { serverId } = req.params;
      const filter = {
        ...parseAnalyticsFilter(req.query),
        serverId
      };

      const [conversion, engagement, effectiveness, performance] = await Promise.all([
        analyticsService.getConversionMetrics(filter),
        analyticsService.getEngagementMetrics(filter),
        analyticsService.getNoteEffectiveness(filter),
        analyticsService.getSystemPerformance(filter)
      ]);

      res.json({
        serverId,
        overview: {
          conversion,
          engagement,
          effectiveness,
          performance
        }
      });
    } catch (error) {
      logger.error('Error getting server analytics overview:', error);
      res.status(500).json({ error: 'Failed to get server analytics overview' });
    }
  });

  router.get('/dashboard-data', async (req, res) => {
    try {
      const filter = parseAnalyticsFilter(req.query);

      const [conversion, engagement, effectiveness, performance, trends] = await Promise.all([
        analyticsService.getConversionMetrics(filter),
        analyticsService.getEngagementMetrics(filter),
        analyticsService.getNoteEffectiveness(filter),
        analyticsService.getSystemPerformance(filter),
        analyticsService.analyzeTrends(filter)
      ]);

      res.json({
        conversion,
        engagement,
        effectiveness,
        performance,
        trends,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting dashboard analytics data:', error);
      res.status(500).json({ error: 'Failed to get dashboard analytics data' });
    }
  });

  return router;
}

function parseAnalyticsFilter(query: any): AnalyticsFilter {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    timeframe: {
      start: query.startDate ? new Date(query.startDate) : defaultStart,
      end: query.endDate ? new Date(query.endDate) : now
    },
    serverId: query.serverId || undefined,
    userId: query.userId || undefined,
    includeMetrics: query.includeMetrics ? query.includeMetrics.split(',') : undefined,
    granularity: query.granularity || 'day'
  };
}