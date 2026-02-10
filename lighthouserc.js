module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'ready in',
      startServerReadyTimeout: 30000,
    },
    upload: {
      target: 'temporary-public-storage',
      config: {
        LHCI_GITHUB_APP_TOKEN: process.env.LHCI_GITHUB_APP_TOKEN,
        LHCI_GITHUB_APP_USERNAME: process.env.LHCI_GITHUB_APP_USERNAME,
      },
    },
  settings: {
        chromeFlags: '--no-sandbox',
      preset: 'desktop',
        throttling: {
          requestLatencyMs: 100,
          downloadThroughputKbps: 1000,
          uploadThroughputKbps: 1000,
        },
      skipThirdPartyResources: true,
    },
};