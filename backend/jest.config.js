export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: [],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
  ],

  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'src/controllers/resultados.controller.js': {
      branches: 80, functions: 90, lines: 90, statements: 90,
    },
    'src/controllers/coordinador.controller.js': {
      branches: 60, functions: 85, lines: 80, statements: 80,
    },
    'src/middlewares/auth.middleware.js': {
      branches: 100, functions: 100, lines: 100, statements: 100,
    },
    'src/middlewares/validate.middleware.js': {
      branches: 100, functions: 100, lines: 100, statements: 100,
    },
    'src/services/cache.service.js': {
      branches: 100, functions: 100, lines: 100, statements: 100,
    },
  },

  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/integration/api.integration.test.js',
    '/__tests__/integration/coordinador.integration.test.js',
  ],
  testTimeout: 30000,
  clearMocks: true,
  verbose: false,
};
