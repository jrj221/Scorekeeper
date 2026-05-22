/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/src/__mocks__/async-storage.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react', esModuleInterop: true } }],
  },
  testMatch: ['**/src/__tests__/**/*.test.ts'],
};
