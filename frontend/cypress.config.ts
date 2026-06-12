import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:8081',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    watchForFileChanges: true,
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.name.includes('chrome')) {
          launchOptions.args.push('--auto-open-devtools-for-tabs');
        }
        return launchOptions;
      });

      return config;
    },
  },
});
