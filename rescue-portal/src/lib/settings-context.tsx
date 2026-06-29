'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface PortalSettings {
  municipalityName: string
  hotline: string
  secondaryHotline: string
  email: string
  mapCenterLat: number
  mapCenterLng: number
}

interface SettingsContextValue {
  settings: PortalSettings
  updateSettings: (patch: Partial<PortalSettings>) => void
}

const STORAGE_KEY = 'rescue_portal_settings'

const DEFAULT_SETTINGS: PortalSettings = {
  municipalityName: process.env.NEXT_PUBLIC_MUNICIPALITY_NAME ?? 'Emergency Rescue Portal',
  hotline: process.env.NEXT_PUBLIC_EMERGENCY_HOTLINE ?? '911',
  secondaryHotline: '',
  email: '',
  mapCenterLat: Number(process.env.NEXT_PUBLIC_MAP_CENTER_LAT ?? 14.5995),
  mapCenterLng: Number(process.env.NEXT_PUBLIC_MAP_CENTER_LNG ?? 120.9842),
}

function loadSettings(): PortalSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_SETTINGS
}

function saveSettings(s: PortalSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PortalSettings>(() => loadSettings())

  function updateSettings(patch: Partial<PortalSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }

  // Listen for changes from other tabs/windows (e.g. admin updates settings)
  useEffect(() => {
    let cancelled = false

    async function loadOrganizationSettings() {
      try {
        const response = await fetch('/api/portal-settings', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json() as { settings?: Partial<PortalSettings> }
        if (!cancelled && payload.settings) {
          setSettings((previous) => {
            const next = { ...previous, ...payload.settings }
            saveSettings(next)
            return next
          })
        }
      } catch {
        // Keep the environment-configured emergency number while offline.
      }
    }

    void loadOrganizationSettings()

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) })
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      cancelled = true
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
