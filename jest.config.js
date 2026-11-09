/**
 * @fileoverview Jest configuration with layered projects and @swc/jest transformer.
 * 
 * Why:
 * 1. Layered Testing Architecture (Jest Projects):
 *    Separates pure algorithmic/backend test suites (Node environment) from DOM-reliant UI test suites (JSDOM).
 *    Node environment provides lightweight, isolated execution without the heavy overhead of simulating DOM, Window,
 *    and HTML APIs, speeding up unit and service test runs by 3-5x.
 * 
 * 2. High-Performance Compilation with @swc/jest:
 *    Replaces babel-jest with @swc/jest (Rust-based SWC compiler). SWC compiles ES modules, JSX, and TypeScript
 *    orders of magnitude faster than Babel, completely eliminating the AST parsing and transpilation bottleneck.
 * 
 * 3. Windows-Optimized Worker Concurrency & Path Compatibility:
 *    - Restricting maxWorkers to '50%' prevents Windows disk I/O thrashing and avoids SQLite database lock
 *      contentions (SQLITE_BUSY) that occur when excessive worker threads concurrently initialize database connections.
 *    - Uses cross-platform glob patterns (`** /tests/...`) and path-agnostic regexes to ensure consistent test matching
 *      across Windows and Unix environments.
 */

// Why: Standard SWC transformation options enabling modern ECMAScript features and React 18 automatic runtime.
const swcConfig = {
  jsc: {
    parser: {
      syntax: 'ecmascript',
      jsx: true,
      dynamicImport: true,
    },
    transform: {
      react: {
        runtime: 'automatic',
      },
    },
  },
};

// Why: Common module resolution mapping ensuring `@/*` resolves directly to the `<rootDir>/src/*` path.
const commonModuleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '\\.(css|less|sass|scss)$': '<rootDir>/tests/__mocks__/styleMock.js',
};

/** @type {import('jest').Config} */
export default {
  testTimeout: 20000,
  // Why: Cap parallel worker processes to 50% CPU allocation on Windows to eliminate file lock contention on SQLite.
  maxWorkers: '50%',

  // Why: Multi-project configuration isolating Node-based backend/logic suites from JSDOM-based UI suites.
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testTimeout: 20000,
      testMatch: [
        '**/tests/api/**/*.test.js',
        '**/tests/services/**/*.test.js',
        '**/tests/integration/**/*.test.js',
        '**/tests/unit/**/*.test.js',
        '**/tests/e2e/stock-analysis.test.js',
        '**/tests/ui/customization.test.js',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        'tests[\\\\/]integration[\\\\/]external',
        // Why: Exclude UI/DOM-dependent test suites from Node environment to avoid missing window/document errors.
        'chatbot-widget',
        'components\\.test',
        'historical-backtest-panel',
        'HistoryTracker',
        'popular-stocks-error-fix',
        'recent-searches-ui',
        'RecentSearches',
        'ui-stock-name-display',
        'reports-page',
        'error-boundary',
        'skeleton',
      ],
      moduleNameMapper: commonModuleNameMapper,
      transform: {
        '^.+\\.(js|jsx)$': ['@swc/jest', swcConfig],
      },
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jest-environment-jsdom',
      testTimeout: 20000,
      testMatch: [
        '**/tests/ui/backtest-sandbox.test.js',
        '**/tests/ui/embedded-backtest-panel.test.js',
        '**/tests/ui/header-navigation.test.js',
        '**/tests/ui/hub-page.test.js',
        '**/tests/ui/kline-tab.test.js',
        '**/tests/ui/reports-page.test.js',
        '**/tests/ui/error-boundary.test.js',
        '**/tests/ui/skeleton.test.js',
        '**/tests/e2e/recent-searches-flow.test.js',
        '**/tests/unit/chatbot-widget.test.js',
        '**/tests/unit/components.test.js',
        '**/tests/unit/historical-backtest-panel.test.js',
        '**/tests/unit/HistoryTracker.test.js',
        '**/tests/unit/popular-stocks-error-fix.test.js',
        '**/tests/unit/recent-searches-ui.test.js',
        '**/tests/unit/RecentSearches.test.js',
        '**/tests/unit/ui-stock-name-display.test.js',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        'tests[\\\\/]integration[\\\\/]external',
      ],
      moduleNameMapper: commonModuleNameMapper,
      transform: {
        '^.+\\.(js|jsx)$': ['@swc/jest', swcConfig],
      },
    },
  ],
};
