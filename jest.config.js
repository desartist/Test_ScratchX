module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'app/api/**/*.js',
    'lib/**/*.js',
    'models/**/*.js',
    '!**/*.config.js',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 30000,
  verbose: true,
  maxWorkers: 4,
  bail: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
