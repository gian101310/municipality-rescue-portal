'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type MasterKeyContextType = {
  isUnlocked: boolean
  unlock: (key: string) => Promise<boolean>
  lock: () => void
}

const MasterKeyContext = createContext<MasterKeyContextType>({
  isUnlocked: false,
  unlock: async () => false,
  lock: () => {},
})

export function useMasterKey() {
  return useContext(MasterKeyContext)
}

export function MasterKeyProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false)

  const unlock = useCallback(async (key: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/verify-master-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterKey: key }),
      })
      if (res.ok) {
        setIsUnlocked(true)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const lock = useCallback(() => {
    setIsUnlocked(false)
  }, [])

  return (
    <MasterKeyContext.Provider value={{ isUnlocked, unlock, lock }}>
      {children}
    </MasterKeyContext.Provider>
  )
}
