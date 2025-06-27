module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./tests/setup/setup.js'],
    testMatch: ['**/tests/**/*.test.(js|ts)'],
  };
  