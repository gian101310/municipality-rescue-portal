'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { DEMO_ORGANIZATION } from '@/lib/demo-data'

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
  municipalityName: DEMO_ORGANIZATION.name,
  hotline: DEMO_ORGANIZATION.emergency_hotline,
  secondaryHotline: DEMO_ORGANIZATION.secondary_hotline || '',
  email: DEMO_ORGANIZATION.email,
  mapCenterLat: DEMO_ORGANIZATION.map_center.lat,
  mapCenterLng: DEMO_ORGANIZATION.map_center.lng,
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
  const [settings, setSettings] = useState<PortalSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setLoaded(true)
  }, [])

  function updateSettings(patch: Partial<PortalSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }

  // Listen for changes from other tabs/windows (e.g. admin updates settings)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) })
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
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
