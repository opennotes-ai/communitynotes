export declare function calculateHelpfulnessRatio(helpful: number, notHelpful: number): number;
export declare function determineContributorLevel(score: number): string;
export declare function isRateLimited(requestCount: number, limit: number): boolean;
export declare function validateDiscordId(id: string): boolean;
export declare function calculateNotePriority(helpfulCount: number, notHelpfulCount: number, timestamp: Date): number;
export declare function formatUserTag(username: string, discriminator: string): string;
export declare function parseCommandArgs(content: string): {
    command: string;
    args: string[];
};
export declare function sanitizeInput(input: string): string;
export declare function generateVerificationCode(): string;
export declare function isValidEmail(email: string): boolean;
export declare function fetchWithTimeout(promise: Promise<any>, timeout: number): Promise<any>;
//# sourceMappingURL=unit.test.d.ts.map