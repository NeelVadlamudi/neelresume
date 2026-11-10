const settings = {
  // A string, not an array. LHCI concatenates this onto the Chrome command,
  // and an array turns into one comma-joined token, so --no-sandbox never
  // arrives. GitHub's runners refuse to start Chrome without it.
  chromeFlags: '--no-sandbox --disable-gpu --disable-dev-shm-usage',
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
};

if (process.env.CHROME_PATH) {
  settings.chromePath = process.env.CHROME_PATH;
}

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'python3 -u -m http.server 4174 --bind 127.0.0.1',
      startServerReadyPattern: 'Serving HTTP',
      url: ['http://127.0.0.1:4174/'],
      numberOfRuns: 3,
      settings,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
