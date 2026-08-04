import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:8081',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    watchForFileChanges: true,
    // There is no cypress/support directory and the specs use only built-in
    // commands. Without this, Cypress aborts before running a single test with
    // "does not contain a default supportFile" — which is why the E2E suite
    // has never actually executed.
    supportFile: false,
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
