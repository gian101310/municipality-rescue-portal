import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ph.rescue.portal',
  appName: 'Rescue Portal PH',
  webDir: 'out',
  server: {
    // Load from production server (Next.js uses API routes, can't do static export)
    url: 'https://www.rescue-portal.ph',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: true,
      spinnerColor: '#3b82f6',
    },
  },
}

export default config
