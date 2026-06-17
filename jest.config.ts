import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  testEnvironment: 'jsdom',
  // Run serially. The mock API layer adds an 800 ms delay to every call, and
  // running the suites in parallel workers on memory-constrained machines
  // (notably Windows with a small paging file) triggers V8 OOM crashes and
  // flaky waitFor timeouts. One worker keeps the run stable and reproducible.
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/components/**/*.{ts,tsx}',
    'src/lib/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
  ],
};

export default createJestConfig(config);
