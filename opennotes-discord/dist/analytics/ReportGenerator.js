import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../shared/utils/logger.js';
export class ReportGenerator {
    REPORTS_DIR = path.join(process.cwd(), 'reports');
    constructor() {
        this.ensureReportsDirectory();
    }
    async generatePDF(report) {
        try {
            const filename = `${report.id}.pdf`;
            const filepath = path.join(this.REPORTS_DIR, filename);
            const htmlContent = this.generateHTMLReport(report);
            await fs.writeFile(filepath.replace('.pdf', '.html'), htmlContent, 'utf8');
            logger.info(`PDF report generated: ${filename}`);
            report.exportFormats.pdf = `/api/analytics/report/${report.id}/download/pdf`;
            return filepath;
        }
        catch (error) {
            logger.error('Error generating PDF report:', error);
            throw error;
        }
    }
    async generateCSV(report) {
        try {
            const filename = `${report.id}.csv`;
            const filepath = path.join(this.REPORTS_DIR, filename);
            const csvContent = this.generateCSVContent(report);
            await fs.writeFile(filepath, csvContent, 'utf8');
            logger.info(`CSV report generated: ${filename}`);
            report.exportFormats.csv = `/api/analytics/report/${report.id}/download/csv`;
            return filepath;
        }
        catch (error) {
            logger.error('Error generating CSV report:', error);
            throw error;
        }
    }
    async generateJSON(report) {
        try {
            const filename = `${report.id}.json`;
            const filepath = path.join(this.REPORTS_DIR, filename);
            const jsonContent = JSON.stringify(report, null, 2);
            await fs.writeFile(filepath, jsonContent, 'utf8');
            logger.info(`JSON report generated: ${filename}`);
            report.exportFormats.json = `/api/analytics/report/${report.id}/download/json`;
            return filepath;
        }
        catch (error) {
            logger.error('Error generating JSON report:', error);
            throw error;
        }
    }
    async generateAllFormats(report) {
        try {
            await Promise.all([
                this.generatePDF(report),
                this.generateCSV(report),
                this.generateJSON(report)
            ]);
            return report;
        }
        catch (error) {
            logger.error('Error generating all report formats:', error);
            throw error;
        }
    }
    generateHTMLReport(report) {
        const { data } = report;
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 40px;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .server-breakdown {
            margin: 20px 0;
        }
        .chart-placeholder {
            background: #f8f9fa;
            height: 200px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p><strong>Generated:</strong> ${report.generatedAt.toLocaleString()}</p>
        <p><strong>Period:</strong> ${report.timeframe.start.toLocaleDateString()} - ${report.timeframe.end.toLocaleDateString()}</p>
        ${report.serverName ? `<p><strong>Server:</strong> ${report.serverName}</p>` : '<p><strong>Scope:</strong> Global</p>'}
    </div>

    <div class="section">
        <h2>📈 Conversion Metrics</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${data.conversionMetrics.totalRequests.toLocaleString()}</div>
                <div class="metric-label">Total Requests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.conversionMetrics.totalNotes.toLocaleString()}</div>
                <div class="metric-label">Total Notes</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.conversionMetrics.conversionRate}%</div>
                <div class="metric-label">Conversion Rate</div>
            </div>
        </div>

        ${this.generateServerBreakdownTable(data.conversionMetrics)}
    </div>

    <div class="section">
        <h2>👥 Engagement Metrics</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${data.engagementMetrics.totalUsers.toLocaleString()}</div>
                <div class="metric-label">Total Users</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.engagementMetrics.activeUsers.toLocaleString()}</div>
                <div class="metric-label">Active Users (30d)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.engagementMetrics.contributorCount.toLocaleString()}</div>
                <div class="metric-label">Contributors</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.engagementMetrics.raterCount.toLocaleString()}</div>
                <div class="metric-label">Raters</div>
            </div>
        </div>

        ${this.generateTopContributorsTable(data.engagementMetrics)}
    </div>

    <div class="section">
        <h2>✅ Note Effectiveness</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${data.noteEffectiveness.averageHelpfulnessRatio}</div>
                <div class="metric-label">Avg Helpfulness Ratio</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.noteEffectiveness.totalVisibleNotes.toLocaleString()}</div>
                <div class="metric-label">Visible Notes</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.noteEffectiveness.effectivenessRate}%</div>
                <div class="metric-label">Effectiveness Rate</div>
            </div>
        </div>

        ${this.generateStatusBreakdownTable(data.noteEffectiveness)}
    </div>

    <div class="section">
        <h2>⚡ System Performance</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${data.systemPerformance.responseTime.average}ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.systemPerformance.errorRate.percentage}%</div>
                <div class="metric-label">Error Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.systemPerformance.uptime.percentage}%</div>
                <div class="metric-label">Uptime</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>📋 Report Details</h2>
        <p><strong>Report ID:</strong> ${report.id}</p>
        <p><strong>Description:</strong> ${report.description}</p>
        <p><strong>Generated at:</strong> ${report.generatedAt.toISOString()}</p>
    </div>
</body>
</html>`;
    }
    generateCSVContent(report) {
        const { data } = report;
        let csv = '';
        csv += 'Report Metadata\n';
        csv += `ID,${report.id}\n`;
        csv += `Title,${report.title}\n`;
        csv += `Generated At,${report.generatedAt.toISOString()}\n`;
        csv += `Period Start,${report.timeframe.start.toISOString()}\n`;
        csv += `Period End,${report.timeframe.end.toISOString()}\n`;
        if (report.serverName) {
            csv += `Server,${report.serverName}\n`;
        }
        csv += '\n';
        csv += 'Conversion Metrics\n';
        csv += 'Metric,Value\n';
        csv += `Total Requests,${data.conversionMetrics.totalRequests}\n`;
        csv += `Total Notes,${data.conversionMetrics.totalNotes}\n`;
        csv += `Conversion Rate,${data.conversionMetrics.conversionRate}%\n`;
        csv += '\n';
        if (data.conversionMetrics.breakdown.byServer.length > 0) {
            csv += 'Server Breakdown\n';
            csv += 'Server,Requests,Notes,Conversion Rate\n';
            data.conversionMetrics.breakdown.byServer.forEach(server => {
                csv += `${server.serverName},${server.requests},${server.notes},${server.conversionRate}%\n`;
            });
            csv += '\n';
        }
        csv += 'Engagement Metrics\n';
        csv += 'Metric,Value\n';
        csv += `Total Users,${data.engagementMetrics.totalUsers}\n`;
        csv += `Active Users,${data.engagementMetrics.activeUsers}\n`;
        csv += `Contributors,${data.engagementMetrics.contributorCount}\n`;
        csv += `Raters,${data.engagementMetrics.raterCount}\n`;
        csv += '\n';
        csv += 'Top Contributors\n';
        csv += 'Username,Notes Count,Ratings Count,Helpfulness Score\n';
        data.engagementMetrics.topContributors.forEach(contributor => {
            csv += `${contributor.username},${contributor.notesCount},${contributor.ratingsCount},${contributor.helpfulnessScore}\n`;
        });
        csv += '\n';
        csv += 'Note Effectiveness\n';
        csv += 'Metric,Value\n';
        csv += `Average Helpfulness Ratio,${data.noteEffectiveness.averageHelpfulnessRatio}\n`;
        csv += `Total Visible Notes,${data.noteEffectiveness.totalVisibleNotes}\n`;
        csv += `Total Hidden Notes,${data.noteEffectiveness.totalHiddenNotes}\n`;
        csv += `Effectiveness Rate,${data.noteEffectiveness.effectivenessRate}%\n`;
        csv += '\n';
        csv += 'System Performance\n';
        csv += 'Metric,Value\n';
        csv += `Average Response Time,${data.systemPerformance.responseTime.average}ms\n`;
        csv += `Error Rate,${data.systemPerformance.errorRate.percentage}%\n`;
        csv += `Uptime,${data.systemPerformance.uptime.percentage}%\n`;
        return csv;
    }
    generateServerBreakdownTable(metrics) {
        if (metrics.breakdown.byServer.length === 0)
            return '';
        return `
        <div class="server-breakdown">
            <h3>Server Breakdown</h3>
            <table>
                <thead>
                    <tr>
                        <th>Server</th>
                        <th>Requests</th>
                        <th>Notes</th>
                        <th>Conversion Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${metrics.breakdown.byServer.map(server => `
                        <tr>
                            <td>${server.serverName}</td>
                            <td>${server.requests.toLocaleString()}</td>
                            <td>${server.notes.toLocaleString()}</td>
                            <td>${server.conversionRate.toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    }
    generateTopContributorsTable(metrics) {
        if (metrics.topContributors.length === 0)
            return '';
        return `
        <div class="server-breakdown">
            <h3>Top Contributors</h3>
            <table>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Notes</th>
                        <th>Ratings</th>
                        <th>Helpfulness Score</th>
                        <th>Join Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${metrics.topContributors.map(contributor => `
                        <tr>
                            <td>${contributor.username}</td>
                            <td>${contributor.notesCount.toLocaleString()}</td>
                            <td>${contributor.ratingsCount.toLocaleString()}</td>
                            <td>${contributor.helpfulnessScore.toFixed(2)}</td>
                            <td>${contributor.joinDate.toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    }
    generateStatusBreakdownTable(metrics) {
        const statusEntries = Object.entries(metrics.breakdown.byStatus);
        if (statusEntries.length === 0)
            return '';
        return `
        <div class="server-breakdown">
            <h3>Notes by Status</h3>
            <table>
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${statusEntries.map(([status, count]) => `
                        <tr>
                            <td>${status}</td>
                            <td>${count.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    }
    async ensureReportsDirectory() {
        try {
            await fs.access(this.REPORTS_DIR);
        }
        catch {
            await fs.mkdir(this.REPORTS_DIR, { recursive: true });
            logger.info(`Created reports directory: ${this.REPORTS_DIR}`);
        }
    }
}
export const reportGenerator = new ReportGenerator();
export default reportGenerator;
//# sourceMappingURL=ReportGenerator.js.map