/** @type {import('jest').Config} */
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testTimeout: 20000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};

export default createJestConfig(customJestConfig);
