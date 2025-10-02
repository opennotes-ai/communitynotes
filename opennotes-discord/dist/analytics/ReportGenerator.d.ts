import type { AnalyticsReport } from './types.js';
export declare class ReportGenerator {
    private readonly REPORTS_DIR;
    constructor();
    generatePDF(report: AnalyticsReport): Promise<string>;
    generateCSV(report: AnalyticsReport): Promise<string>;
    generateJSON(report: AnalyticsReport): Promise<string>;
    generateAllFormats(report: AnalyticsReport): Promise<AnalyticsReport>;
    private generateHTMLReport;
    private generateCSVContent;
    private generateServerBreakdownTable;
    private generateTopContributorsTable;
    private generateStatusBreakdownTable;
    private ensureReportsDirectory;
}
export declare const reportGenerator: ReportGenerator;
export default reportGenerator;
//# sourceMappingURL=ReportGenerator.d.ts.map