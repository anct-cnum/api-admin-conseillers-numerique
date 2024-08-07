/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src/services/conseillers/controllers/getConseillersPourLaCoopMediation.ts'],
      provider: 'istanbul',
      skipFull: true,
      watermarks: {
        branches: [95, 100],
        functions: [95, 100],
        lines: [95, 100],
        statements: [95, 100],
      },
    },
    globals: true,
    //sequence: { shuffle: true },
    globalSetup: ['src/tests/setup.ts'],
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
