module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/prisma/'],
  testMatch: ['**/tests/**/*.test.{js,ts}'],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  // Collect coverage from source files
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts}',
  ],
  // Coverage thresholds - enforces quality gate
  // Note: Integration tests may have lower coverage than unit tests
  // Adjust thresholds based on your testing strategy
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70,
    },
  },
};
