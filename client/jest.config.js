module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  setupFiles: ['./jest.setup.js'],
  collectCoverageFrom: [
    'services/**/*.ts',
    '!services/**/*.test.ts',
  ],
  verbose: true,
};
