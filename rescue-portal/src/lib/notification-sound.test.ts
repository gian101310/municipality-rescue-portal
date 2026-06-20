import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SOUND_PREF_KEY,
  getIncidentAlarmPattern,
  getStoredSoundPreference,
  setStoredSoundPreference,
} from './notification-sound.ts'

test('sound preference defaults to false when storage is unavailable', () => {
  assert.equal(getStoredSoundPreference(null), false)
})

test('incident alarm uses a repeated urgent pattern', () => {
  assert.deepEqual(getIncidentAlarmPattern(), [740, 980, 740, 980, 740, 980])
})

test('sound preference reads true only from the enabled value', () => {
  assert.equal(getStoredSoundPreference({ getItem: () => 'enabled' }), true)
  assert.equal(getStoredSoundPreference({ getItem: () => 'disabled' }), false)
})

test('setStoredSoundPreference writes stable enabled and disabled values', () => {
  const writes: Record<string, string> = {}
  const storage = {
    setItem: (key: string, value: string) => {
      writes[key] = value
    },
  }

  setStoredSoundPreference(storage, true)
  assert.equal(writes[SOUND_PREF_KEY], 'enabled')

  setStoredSoundPreference(storage, false)
  assert.equal(writes[SOUND_PREF_KEY], 'disabled')
})
