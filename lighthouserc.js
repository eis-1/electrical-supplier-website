module.exports = {
  ci: {
    collect: {
      // Start server before collecting data
      startServerCommand: 'cd backend && npm run start',
      startServerReadyPattern: 'Server running on port',
      startServerReadyTimeout: 30000,

      // URLs to test
      url: [
        'http://localhost:5000/',
        'http://localhost:5000/products',
        'http://localhost:5000/about',
        'http://localhost:5000/contact',
        'http://localhost:5000/quote',
      ],

      // Number of runs per URL (median is used)
      numberOfRuns: 3,

      settings: {
        // Emulate mobile by default
        preset: 'desktop',

        // Chrome flags for headless
        chromeFlags: '--no-sandbox --disable-gpu',
      },
    },

    assert: {
      // Performance budgets
      assertions: {
        'categories:performance': ['error', { minScore: 0.90 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'categories:pwa': 'off',

        // Specific metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // Resources
        'resource-summary:script:size': ['warn', { maxNumericValue: 500000 }],
        'resource-summary:image:size': ['warn', { maxNumericValue: 1000000 }],
        'resource-summary:document:size': ['warn', { maxNumericValue: 100000 }],

        // SEO essentials
        'meta-description': 'error',
        'document-title': 'error',
        'viewport': 'error',
        'robots-txt': 'warn',
        'canonical': 'warn',
      },
    },

    upload: {
      target: 'temporary-public-storage',
    },
  },
};
