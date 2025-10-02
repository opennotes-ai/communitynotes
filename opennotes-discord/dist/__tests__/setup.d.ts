/**
 * Jest setup file for configuring the test environment
 */
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeWithinRange(floor: number, ceiling: number): R;
            toBeValidDiscordId(): R;
            toBeValidUUID(): R;
        }
    }
}
export {};
//# sourceMappingURL=setup.d.ts.map