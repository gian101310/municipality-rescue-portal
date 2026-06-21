export const SOUND_PREF_KEY = 'rescue_portal_notification_sound'

type ReadableStorage = Pick<Storage, 'getItem'>
type WritableStorage = Pick<Storage, 'setItem'>

type WindowWithAudio = Window & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

let adminAudioContext: AudioContext | null = null

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

export function shouldAutoEnableAdminSound(storage: ReadableStorage | null) {
  try {
    return storage?.getItem(SOUND_PREF_KEY) !== 'disabled'
  } catch {
    return true
  }
}

function getAdminAudioContext() {
  if (typeof window === 'undefined') return null
  if (adminAudioContext) return adminAudioContext

  const audioWindow = window as WindowWithAudio
  const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext
  if (!AudioContextCtor) return null

  try {
    adminAudioContext = new AudioContextCtor()
    return adminAudioContext
  } catch {
    return null
  }
}

export async function armAdminNotificationSound() {
  const context = getAdminAudioContext()
  if (!context) return false

  try {
    if (context.state === 'suspended') await context.resume()
    return context.state === 'running'
  } catch {
    return false
  }
}

function playTone(frequency: number, startTime: number, duration: number, volume: number) {
  const context = adminAudioContext
  if (!context || context.state !== 'running') return

  try {
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

  } catch {
    // Audio is optional; blocked playback should not break the UI.
  }
}

export function playSosDemoSound() {
  void armAdminNotificationSound().then(() => {
    playTone(880, 0, 0.16, 0.09)
    playTone(660, 0.24, 0.18, 0.06)
  })
}

export function getIncidentAlarmPattern() {
  return [740, 980, 740, 980, 740, 980]
}

export function isIncidentAlarmMandatory() {
  return true
}

export function getMandatoryIncidentSirenPattern() {
  return [520, 960, 520, 960, 520, 960, 520, 960, 520, 960, 520, 960]
}

export function playAdminNotificationSound() {
  if (typeof window === 'undefined') return

  getMandatoryIncidentSirenPattern().forEach((frequency, index) => {
    for (let cycle = 0; cycle < 3; cycle += 1) {
      playTone(frequency, cycle * 3.6 + index * 0.28, 0.24, 0.16)
    }
  })
}
