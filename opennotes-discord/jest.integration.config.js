export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__integration__/**/*.integration.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration-setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2022',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  testTimeout: 60000,
  maxConcurrency: 1,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.test.ts',
    '!src/__integration__/**',
    '!src/__tests__/**',
    '!src/dashboard/**',
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  resolver: undefined,
};
