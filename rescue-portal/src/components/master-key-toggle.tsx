'use client'

import { useState } from 'react'
import { Lock, Unlock, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMasterKey } from '@/components/master-key-provider'
import { toast } from 'sonner'

export function MasterKeyToggle() {
  const { isUnlocked, unlock, lock } = useMasterKey()
  const [showInput, setShowInput] = useState(false)
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUnlock = async () => {
    if (!key.trim()) {
      toast.error('Enter the master key.')
      return
    }
    setLoading(true)
    const success = await unlock(key.trim())
    setLoading(false)
    if (success) {
      toast.success('Portal unlocked — editing enabled.')
      setShowInput(false)
      setKey('')
    } else {
      toast.error('Invalid master key.')
    }
  }

  const handleLock = () => {
    lock()
    toast.info('Portal locked — editing disabled.')
  }

  if (isUnlocked) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLock}
        className="gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
        title="Click to lock editing"
      >
        <Unlock className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Unlocked</span>
      </Button>
    )
  }

  if (showInput) {
    return (
      <div className="flex items-center gap-1.5">
        <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
        <Input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock() }}
          placeholder="Master key"
          className="h-7 w-32 bg-slate-800 border-slate-600 text-white text-xs"
          autoFocus
          disabled={loading}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleUnlock}
          disabled={loading}
          className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-800"
        >
          {loading ? '...' : 'Go'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setShowInput(false); setKey('') }}
          className="h-7 px-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800"
        >
          ✕
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShowInput(true)}
      className="gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-slate-800"
      title="Click to unlock editing"
    >
      <Lock className="w-4 h-4" />
      <span className="text-xs font-medium hidden sm:inline">Locked</span>
    </Button>
  )
}
