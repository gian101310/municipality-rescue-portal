import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SOUND_PREF_KEY,
  getIncidentAlarmPattern,
  getMandatoryIncidentSirenPattern,
  isIncidentAlarmMandatory,
  getStoredSoundPreference,
  setStoredSoundPreference,
  shouldAutoEnableAdminSound,
} from './notification-sound.ts'

test('sound preference defaults to false when storage is unavailable', () => {
  assert.equal(getStoredSoundPreference(null), false)
})

test('incident alarm uses a repeated urgent pattern', () => {
  assert.deepEqual(getIncidentAlarmPattern(), [740, 980, 740, 980, 740, 980])
})

test('incident alarm is mandatory and uses an extended siren pattern', () => {
  assert.equal(isIncidentAlarmMandatory(), true)
  assert.deepEqual(getMandatoryIncidentSirenPattern(), [520, 960, 520, 960, 520, 960, 520, 960, 520, 960, 520, 960])
})

test('sound preference reads true only from the enabled value', () => {
  assert.equal(getStoredSoundPreference({ getItem: () => 'enabled' }), true)
  assert.equal(getStoredSoundPreference({ getItem: () => 'disabled' }), false)
})

test('automatic audio arming preserves an explicit mute', () => {
  assert.equal(shouldAutoEnableAdminSound(null), true)
  assert.equal(shouldAutoEnableAdminSound({ getItem: () => 'enabled' }), true)
  assert.equal(shouldAutoEnableAdminSound({ getItem: () => 'disabled' }), false)
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
