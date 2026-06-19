export const SOUND_PREF_KEY = 'rescue_portal_notification_sound'

type ReadableStorage = Pick<Storage, 'getItem'>
type WritableStorage = Pick<Storage, 'setItem'>

type WindowWithAudio = Window & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

export function getStoredSoundPreference(storage: ReadableStorage | null) {
  try {
    return storage?.getItem(SOUND_PREF_KEY) === 'enabled'
  } catch {
    return false
  }
}

export function setStoredSoundPreference(storage: WritableStorage | null, enabled: boolean) {
  try {
    storage?.setItem(SOUND_PREF_KEY, enabled ? 'enabled' : 'disabled')
  } catch {
    // Storage can be blocked in privacy modes; sound simply becomes session-only.
  }
}

function playTone(frequency: number, startTime: number, duration: number, volume: number) {
  if (typeof window === 'undefined') return

  const audioWindow = window as WindowWithAudio
  const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext
  if (!AudioContextCtor) return

  try {
    const context = new AudioContextCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + startTime)
    gain.gain.setValueAtTime(0.0001, context.currentTime + startTime)
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + startTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + startTime + duration)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(context.currentTime + startTime)
    oscillator.stop(context.currentTime + startTime + duration + 0.02)

    window.setTimeout(() => {
      void context.close().catch(() => null)
    }, (startTime + duration + 0.08) * 1000)
  } catch {
    // Audio is optional; blocked playback should not break the UI.
  }
}

export function playSosDemoSound() {
  playTone(880, 0, 0.16, 0.09)
  playTone(660, 0.24, 0.18, 0.06)
}

export function playAdminNotificationSound() {
  playTone(740, 0, 0.12, 0.045)
  playTone(980, 0.15, 0.1, 0.035)
}
