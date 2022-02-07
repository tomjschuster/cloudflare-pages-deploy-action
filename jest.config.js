module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  verbose: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coveragePathIgnorePatterns: [
    // Tested by build-test.test workflow job
    'src/main.ts',
  ],
}
