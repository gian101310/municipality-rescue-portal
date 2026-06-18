'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Locale = 'en' | 'fil'

const translations: Record<string, Record<Locale, string>> = {
  // Navigation & Common
  'nav.signIn': { en: 'Sign In', fil: 'Mag-sign In' },
  'nav.getHelp': { en: 'Get Help', fil: 'Humingi ng Tulong' },
  'nav.features': { en: 'Features', fil: 'Mga Feature' },
  'nav.emergency': { en: 'Emergency', fil: 'Emergency' },
  'common.submit': { en: 'Submit', fil: 'Isumite' },
  'common.cancel': { en: 'Cancel', fil: 'Kanselahin' },
  'common.save': { en: 'Save', fil: 'I-save' },
  'common.back': { en: 'Back', fil: 'Bumalik' },
  'common.next': { en: 'Next', fil: 'Susunod' },
  'common.close': { en: 'Close', fil: 'Isara' },
  'common.search': { en: 'Search', fil: 'Maghanap' },
  'common.loading': { en: 'Loading...', fil: 'Naglo-load...' },
  'common.signOut': { en: 'Sign Out', fil: 'Mag-sign Out' },

  // Landing Page
  'landing.badge': { en: 'Active Emergency Response', fil: 'Aktibong Emergency Response' },
  'landing.subtitle': { en: 'Municipal Emergency Response System', fil: 'Sistema ng Munisipal na Pagtugon sa Emergency' },
  'landing.description': { en: 'Report emergencies instantly, track rescue operations in real time, and connect with municipal rescue teams—all from your phone.', fil: 'Mag-ulat ng emergency agad, subaybayan ang rescue operations sa real time, at kumonekta sa municipal rescue teams—mula sa iyong telepono.' },
  'landing.requestRescue': { en: 'Request Rescue', fil: 'Humiling ng Rescue' },
  'landing.adminDashboard': { en: 'Admin Dashboard', fil: 'Admin Dashboard' },
  'landing.registerPrompt': { en: 'Registered residents get priority response.', fil: 'Ang mga rehistradong residente ay may priority response.' },
  'landing.registerNow': { en: 'Register now', fil: 'Mag-rehistro na' },
  'landing.builtFor': { en: 'Built for Emergency Response', fil: 'Gawa para sa Emergency Response' },
  'landing.builtForSub': { en: 'Everything your municipality needs to respond faster.', fil: 'Lahat ng kailangan ng iyong munisipalidad para tumugon nang mas mabilis.' },
  'landing.realTimeAlerts': { en: 'Real-Time Alerts', fil: 'Real-Time na Alerto' },
  'landing.realTimeAlertsDesc': { en: 'Instant notifications to dispatchers and rescue teams the moment an emergency is reported. Telegram integration keeps teams connected.', fil: 'Agarang notipikasyon sa mga dispatcher at rescue team sa sandaling may naiulat na emergency. Telegram integration para laging konektado ang mga team.' },
  'landing.gpsTracking': { en: 'GPS Tracking', fil: 'GPS Tracking' },
  'landing.gpsTrackingDesc': { en: 'Automatic location capture on report submission. Live map view shows all active incidents and team positions.', fil: 'Awtomatikong pagkuha ng lokasyon sa pagsumite ng ulat. Live map view na nagpapakita ng lahat ng aktibong insidente at posisyon ng mga team.' },
  'landing.teamDispatch': { en: 'Team Dispatch', fil: 'Pag-dispatch ng Team' },
  'landing.teamDispatchDesc': { en: 'Manage rescue units, assign teams, and track operation status from a single command center dashboard.', fil: 'Pamahalaan ang mga rescue unit, mag-assign ng mga team, at subaybayan ang status ng operasyon mula sa iisang command center dashboard.' },
  'landing.hotlineLabel': { en: 'Emergency Hotline', fil: 'Emergency Hotline' },
  'landing.hotlineAvail': { en: 'Available 24 hours a day, 7 days a week', fil: 'Bukas 24 oras, 7 araw sa isang linggo' },
  'landing.secondary': { en: 'Secondary', fil: 'Pangalawa' },
  'landing.lifeThreaten': { en: 'For life-threatening emergencies, also call 911 (National Emergency Hotline)', fil: 'Para sa mga emergency na banta sa buhay, tumawag din sa 911 (National Emergency Hotline)' },
  'landing.howItWorks': { en: 'How It Works', fil: 'Paano Ito Gumagana' },
  'landing.step1': { en: 'Register', fil: 'Mag-rehistro' },
  'landing.step1Desc': { en: 'Create your resident account with a valid ID', fil: 'Gumawa ng resident account gamit ang valid ID' },
  'landing.step2': { en: 'Report', fil: 'Mag-ulat' },
  'landing.step2Desc': { en: 'Tap SOS and describe your emergency', fil: 'I-tap ang SOS at ilarawan ang iyong emergency' },
  'landing.step3': { en: 'Dispatch', fil: 'I-dispatch' },
  'landing.step3Desc': { en: 'Nearest team is assigned and dispatched', fil: 'Ang pinakamalapit na team ay ini-assign at nadi-dispatch' },
  'landing.step4': { en: 'Respond', fil: 'Tumugon' },
  'landing.step4Desc': { en: 'Track the team live until they arrive', fil: 'Subaybayan ang team nang live hanggang sa dumating sila' },

  // Emergency Report
  'emergency.title': { en: 'Report Emergency', fil: 'Mag-ulat ng Emergency' },
  'emergency.selectType': { en: 'Select the type of emergency', fil: 'Piliin ang uri ng emergency' },
  'emergency.details': { en: 'Emergency Details', fil: 'Detalye ng Emergency' },
  'emergency.location': { en: 'Location', fil: 'Lokasyon' },
  'emergency.shareLocation': { en: 'Share My Location', fil: 'Ibahagi ang Aking Lokasyon' },
  'emergency.describe': { en: 'Describe the emergency', fil: 'Ilarawan ang emergency' },
  'emergency.describePlaceholder': { en: 'What is happening? Include any important details about the situation, number of people involved, hazards, etc.', fil: 'Ano ang nangyayari? Isama ang mahahalagang detalye tungkol sa sitwasyon, bilang ng mga taong involved, mga panganib, atbp.' },
  'emergency.howMany': { en: 'How many people are affected?', fil: 'Ilang tao ang apektado?' },
  'emergency.hazards': { en: 'Additional Hazards', fil: 'Karagdagang mga Panganib' },
  'emergency.unconscious': { en: 'Someone is unconscious or unresponsive', fil: 'May tao na nawalan ng malay o hindi tumutugon' },
  'emergency.firePres': { en: 'There is fire present', fil: 'May sunog' },
  'emergency.flooding': { en: 'Area is flooding or waterlogged', fil: 'Ang lugar ay binabaha o may tubig' },
  'emergency.violence': { en: 'There is violence or threat of violence', fil: 'May karahasan o banta ng karahasan' },
  'emergency.trapped': { en: 'Someone is trapped or pinned', fil: 'May tao na nakulong o naipit' },
  'emergency.hazmat': { en: 'Hazardous materials or chemical exposure', fil: 'Mapanganib na materyales o kemikal' },
  'emergency.photos': { en: 'Photos (optional)', fil: 'Mga Larawan (opsyonal)' },
  'emergency.photosTap': { en: 'Tap to take or upload photos', fil: 'I-tap para kumuha o mag-upload ng larawan' },
  'emergency.confirm': { en: 'Continue to Confirm', fil: 'Magpatuloy sa Pagkumpirma' },
  'emergency.confirmTitle': { en: 'Confirm Emergency Report', fil: 'Kumpirmahin ang Ulat ng Emergency' },
  'emergency.sendReport': { en: 'SEND EMERGENCY REPORT', fil: 'IPADALA ANG ULAT NG EMERGENCY' },
  'emergency.success': { en: 'Emergency Report Submitted', fil: 'Naisumite na ang Ulat ng Emergency' },
  'emergency.successMsg': { en: 'Your emergency has been received. Help is on the way. Stay safe and keep your phone accessible.', fil: 'Natanggap na ang iyong emergency. Paparating na ang tulong. Manatiling ligtas at panatilihing accessible ang iyong telepono.' },
  'emergency.callHotline': { en: 'Call Hotline', fil: 'Tumawag sa Hotline' },
  'emergency.call911': { en: '911 National Emergency', fil: '911 National Emergency' },
  'emergency.warning': { en: 'For life-threatening emergencies, call 911 immediately while using this app.', fil: 'Para sa mga emergency na banta sa buhay, tumawag agad sa 911 habang ginagamit ang app na ito.' },

  // Auth
  'auth.login': { en: 'Sign In', fil: 'Mag-sign In' },
  'auth.register': { en: 'Create Account', fil: 'Gumawa ng Account' },
  'auth.email': { en: 'Email', fil: 'Email' },
  'auth.password': { en: 'Password', fil: 'Password' },
  'auth.forgotPassword': { en: 'Forgot password?', fil: 'Nakalimutan ang password?' },
  'auth.noAccount': { en: "Don't have an account?", fil: 'Wala pang account?' },
  'auth.hasAccount': { en: 'Already have an account?', fil: 'May account na?' },
  'auth.resident': { en: 'Resident', fil: 'Residente' },
  'auth.staff': { en: 'Staff', fil: 'Staff' },

  // Profile
  'profile.title': { en: 'Profile', fil: 'Profile' },
  'profile.personalInfo': { en: 'Personal Information', fil: 'Personal na Impormasyon' },
  'profile.address': { en: 'Address', fil: 'Address' },
  'profile.idVerification': { en: 'ID Verification', fil: 'ID Verification' },
  'profile.emergencyContact': { en: 'Emergency Contact', fil: 'Emergency Contact' },
  'profile.dependents': { en: 'Dependent & Household Contacts', fil: 'Mga Dependent at Household Contact' },
  'profile.dependentsDesc': { en: 'People in your household who may need rescue assistance. Their info is shared with responders during emergencies.', fil: 'Mga tao sa iyong bahay na maaaring mangailangan ng rescue assistance. Ibinabahagi ang kanilang impormasyon sa mga responder sa panahon ng emergency.' },
  'profile.addContact': { en: 'Add', fil: 'Dagdagan' },
  'profile.verified': { en: 'Verified Resident', fil: 'Verified Resident' },
  'profile.verifiedOn': { en: 'Account verified on', fil: 'Account na-verify noong' },
  'profile.pending': { en: 'Verification Pending', fil: 'Pending ang Verification' },
  'profile.pendingMsg': { en: 'Your account is currently under review. This may take 1-3 business days.', fil: 'Kasalukuyang sinusuri ang iyong account. Maaaring tumagal ng 1-3 araw ng trabaho.' },

  // Resident Navigation
  'resNav.home': { en: 'Home', fil: 'Home' },
  'resNav.emergency': { en: 'Emergency', fil: 'Emergency' },
  'resNav.history': { en: 'History', fil: 'Kasaysayan' },
  'resNav.profile': { en: 'Profile', fil: 'Profile' },
}

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

const STORAGE_KEY = 'rescue_portal_locale'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved === 'en' || saved === 'fil') setLocaleState(saved)
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  function t(key: string): string {
    return translations[key]?.[locale] ?? key
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
