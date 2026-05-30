module.exports = {
  // Środowisko testowe
  testEnvironment: 'node',

  // Gdzie szukać testów
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Ignoruj foldery
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Pokrycie kodu
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    '!**/*.test.js'
  ],

  // Próg pokrycia (minimum %)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Setupy
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: [],

  // Timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true
};
