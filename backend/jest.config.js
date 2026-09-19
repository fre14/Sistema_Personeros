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
    // app.js se cubre por la suite de integracion HTTP, pero su bloque de
    // arranque (listen, SIGTERM, apagado ordenado) no se puede ejercer sin
    // levantar el proceso real. Se excluye para no falsear el porcentaje.
    '!src/app.js',
  ],

  coverageThreshold: {
    // Puerta global. Por debajo de esto, `npm test` falla.
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    // El codigo que decide si un acta entra al conteo, y quien puede
    // tocarla, se exige por encima del resto: una regresion aqui no es un
    // fallo de interfaz, es un voto mal contado.
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

  testMatch: ['**/tests/**/*.test.js'],
  // Las suites que exigen PostgreSQL levantado quedan fuera de la ejecucion
  // por defecto: se corren aparte con `npm run test:db`.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/integration/api.integration.test.js',
    '/tests/integration/coordinador.integration.test.js',
  ],
  testTimeout: 30000,
  clearMocks: true,
  verbose: false,
};
