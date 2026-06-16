'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'en' | 'ar' | 'fr' | 'es' | 'de' | 'it'

export const LANGUAGES: { code: Language; label: string; flag: string; rtl?: boolean }[] = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',  flag: '🇸🇦', rtl: true },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
]

// ─── English dictionary (always included — default language) ──────────────────
const en: Record<string, string> = {
  appName: 'Sindbad Luxury',
  tagline: 'Your Personal AI Assistant',
  adminBtn: 'Admin',
  localTime: 'Local Time',
  heroTitle: 'Welcome to',
  heroSubtitle: 'Discover the perfect hotel experience with your personal AI assistant. Get personalized recommendations, real-time info, and local activities.',
  featureBeach: 'Beach Access',
  featureWeather: 'Perfect Weather',
  featureAI: '24/7 AI Assistant',
  sectionTitle: 'Choose Your Perfect Hotel',
  sectionSubtitle: 'Each hotel comes with a dedicated AI concierge to enhance your stay',
  cardFeatures: 'Features',
  cardSpecialties: 'Specialties',
  cardCTA: 'Start Your Experience',
  loadingTitle: 'Preparing Your Experience',
  loadingSubtitle: 'Setting up AI concierge for',
  footerText: '© 2025 Tunisia Hotel Assistant · Your perfect tourist experience',
  hotelAssistant: 'Hotel assistant',
  backBtn: 'Back',
  liveContext: 'Live context',
  hotelDetails: 'Hotel details',
  weatherLabel: 'Weather',
  tempLabel: 'Temperature',
  humidityLabel: 'Humidity',
  windLabel: 'Wind',
  loadingWeather: 'Loading weather...',
  unavailable: 'Unavailable',
  notAvailable: 'Not available',
  available: 'Available',
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  frontDesk: 'Front desk',
  wifi: 'WiFi',
  feelsLike: 'feels like',
  feat_beachAccess: 'Beach Access',
  feat_spaWellness: 'Spa & Wellness',
  feat_multipleRestaurants: 'Multiple Restaurants',
  feat_kidsClub: 'Kids Club',
  feat_privateBeach: 'Private Beach',
  feat_waterSports: 'Water Sports',
  feat_familyActivities: 'Family Activities',
  feat_allInclusive: 'All-Inclusive',
  feat_historicLocation: 'Historic Location',
  feat_luxurySpa: 'Luxury Spa',
  feat_fineDining: 'Fine Dining',
  feat_culturalTours: 'Cultural Tours',
  spec_traditionalArch: 'Traditional Architecture',
  spec_beachfrontLocation: 'Beachfront Location',
  spec_culturalActivities: 'Cultural Activities',
  spec_familyEntertainment: 'Family Entertainment',
  spec_waterActivities: 'Water Activities',
  spec_kidsPrograms: 'Kids Programs',
  spec_historicMedina: 'Historic Medina Tours',
  spec_localExperiences: 'Local Experiences',
  spec_premiumService: 'Premium Service',
  welcomeMessage: 'Welcome to {name}. I can help with hotel facilities, schedules, nearby attractions, weather updates, and hotel amenities. For bookings or actions, please contact the front desk directly. How can I help you today?',
  guestAssistant: 'Guest assistant',
  guestAssistantSub: 'Ask about schedules, amenities, activities, attractions, or general hotel information.',
  chatPlaceholder: 'Ask about breakfast hours, nearby attractions, WiFi, events, or hotel services...',
  assistantTyping: 'Assistant is preparing a response...',
  upcomingEvents: 'Upcoming Events',
  reserveSpot: 'Reserve a spot',
  dateTBA: 'Date TBA',
  hotelNotFound: 'Hotel not found',
  returnHome: 'Return home',
  formTitle: 'Welcome to',
  formSubtitle: 'Help us personalize your experience by sharing a few details',
  ageRange: 'Age Range',
  age1825: '18-25 years',
  age2635: '26-35 years',
  age3650: '36-50 years',
  age50plus: '50+ years',
  nationality: 'Nationality',
  nationalityPlaceholder: 'e.g., French, German, American',
  travelPurpose: 'Travel Purpose',
  purposeLeisure: 'Leisure / Vacation',
  purposeBusiness: 'Business Trip',
  purposeFamily: 'Family Vacation',
  purposeHoneymoon: 'Honeymoon / Romance',
  travelingWith: 'Traveling With',
  groupSolo: 'Solo Traveler',
  groupCouple: 'Couple',
  groupFamily: 'Family',
  groupGroup: 'Group / Friends',
  saving: 'Saving...',
  continueBtn: 'Continue to Chat Assistant',
  formFooter: 'Your information helps us provide better recommendations and improve our services',
  voiceSpeak: 'Speak',
  voiceListening: 'Listening...',
  voiceOutputOn: 'Voice on',
  voiceOutputOff: 'Voice off',
  voiceStop: 'Stop',
  voiceErrorPermission: 'Microphone access is blocked. Allow microphone permission in your browser, then try again.',
  voiceErrorNoSpeech: 'No speech detected. Please try speaking again.',
  voiceErrorNetwork: 'Speech recognition needs an internet connection. Please check your network.',
  voiceErrorGeneric: 'Voice input is not available right now. Please try again or type your message.',
  'hotel_sindbad-hammamet_desc': 'Luxury beachfront resort with traditional Tunisian charm and modern amenities.',
  'hotel_villa-didon-carthage_desc': 'Exclusive 5-star boutique hotel on Byrsa Hill with panoramic views over the Gulf of Tunis and the UNESCO Carthage ruins on the doorstep.',
  'hotel_belvedere-fourati-tunis_desc': '4-star hotel 100 m from Belvédère Park in central Tunis — ideal for business and leisure, with free parking and fast access to the Medina and Carthage.',
  heroEyebrow: 'The Future of Hospitality',
  heroHeading1: 'Experience',
  heroHeading2: 'Unrivaled Luxury',
  heroSub: 'Discover a world where timeless elegance meets modern intelligence. Our personalised AI concierge anticipates your every desire, ensuring your stay is nothing short of perfection.',
  heroCtaPrimary: 'Explore our Hotels',
  heroCtaSecondary: 'Learn More',
  collectionEyebrow: 'Exceptional properties curated for the discerning traveller.',
  collectionTitle: 'The Collection',
  navHotels: 'Hotels',
  navFeatures: 'Features',
  cardCTA: 'Chat with the Assistant',
  'hotel_sindbad-hammamet_tagline': 'Beachfront Escape',
  'hotel_villa-didon-carthage_tagline': 'Boutique Perfection',
  'hotel_belvedere-fourati-tunis_tagline': 'Urban Sanctuary',
  featuresEyebrow: 'What our platform offers',
  featuresTitle: 'Smart Hotel Features',
  feature1Title: 'AI Concierge',
  feature1Body: 'Our intelligent assistant anticipates every need — from dining reservations to local discoveries — available 24/7 in six languages.',
  feature2Title: 'Real-Time Hotel Management',
  feature2Body: 'Hotel staff can instantly update services, operating hours, and guest information through a centralised smart dashboard.',
  feature3Title: 'Seamless Guest Experience',
  feature3Body: 'From check-in to check-out, every interaction is streamlined so guests focus on enjoying their stay, not navigating it.',
  footerBrandSub: "Tunisia's finest hospitality collection",
}

// ─── Lazy loaders for non-English dictionaries ────────────────────────────────
// Each language module is only downloaded when the user actually switches to it.
const loaders: Record<Exclude<Language, 'en'>, () => Promise<Record<string, string>>> = {
  fr: () => import('./locales/fr').then(m => m.default),
  ar: () => import('./locales/ar').then(m => m.default),
  es: () => import('./locales/es').then(m => m.default),
  de: () => import('./locales/de').then(m => m.default),
  it: () => import('./locales/it').then(m => m.default),
}

// Runtime cache so each locale is only fetched once per session
const loadedDicts: Partial<Record<Language, Record<string, string>>> = { en }

// ─── Context ──────────────────────────────────────────────────────────────────
interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  isRTL: false,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  // Holds the active dictionary; starts with English so first render is instant.
  const [dict, setDict] = useState<Record<string, string>>(en)

  // Restore persisted language preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('appLanguage') as Language | null
    if (saved && saved !== 'en' && loaders[saved as Exclude<Language, 'en'>]) {
      loadLanguage(saved)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply RTL + html attributes whenever language changes
  useEffect(() => {
    const isRTL = LANGUAGES.find(l => l.code === language)?.rtl ?? false
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  async function loadLanguage(lang: Language) {
    if (lang === 'en') {
      setLanguageState('en')
      setDict(en)
      return
    }
    // Use cached version if already loaded this session
    if (loadedDicts[lang]) {
      setLanguageState(lang)
      setDict(loadedDicts[lang]!)
      return
    }
    try {
      const loaded = await loaders[lang as Exclude<Language, 'en'>]()
      loadedDicts[lang] = loaded
      setLanguageState(lang)
      setDict(loaded)
    } catch {
      // Fallback to English if locale chunk fails to load
      setLanguageState('en')
      setDict(en)
    }
  }

  const setLanguage = (lang: Language) => {
    localStorage.setItem('appLanguage', lang)
    loadLanguage(lang)
  }

  const t = (key: string): string => dict[key] ?? en[key] ?? key

  const isRTL = LANGUAGES.find(l => l.code === language)?.rtl ?? false

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
