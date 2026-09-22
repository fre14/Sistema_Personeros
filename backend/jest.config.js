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
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    'src/controllers/resultados.controller.js': {
      branches: 95, functions: 100, lines: 100, statements: 100,
    },
    'src/controllers/coordinador.controller.js': {
      branches: 100, functions: 100, lines: 100, statements: 100,
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
