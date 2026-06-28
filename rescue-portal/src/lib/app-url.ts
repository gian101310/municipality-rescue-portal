const PRODUCTION_APP_URL = 'https://www.rescue-portal.ph'

export function getCanonicalAppUrl(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim()
  if (!configured) return PRODUCTION_APP_URL

  try {
    const url = new URL(configured)
    const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
      || url.port === '3000'

    if (env.NODE_ENV === 'production' && isLoopback) return PRODUCTION_APP_URL
    return url.origin
  } catch {
    return PRODUCTION_APP_URL
  }
}
