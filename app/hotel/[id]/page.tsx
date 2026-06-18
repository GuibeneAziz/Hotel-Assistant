'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CalendarDays, Droplets, MapPin, Mic, Send, Square, Sun, Thermometer, ThumbsDown, ThumbsUp, Volume2, VolumeX, Wind, X } from 'lucide-react'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import GuestRegistrationForm, { GuestProfile } from '@/app/components/GuestRegistrationForm'
import { useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import { getTodayLocal, isUpcomingEvent, normalizeEventDate } from '@/lib/event-dates'
import { fetchLiveWeather, type LiveWeather } from '@/lib/weather'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type WeatherData = LiveWeather

interface HotelPageState {
  showRegistration: boolean
  sessionId: string | null
  guestProfile: GuestProfile | null
}

type HotelId = 'sindbad-hammamet' | 'villa-didon-carthage' | 'belvedere-fourati-tunis'

const hotelData: Record<HotelId, {
  name: string
  location: string
  description: string
  image: string
  color: string
  coordinates: { lat: number; lon: number }
}> = {
  'sindbad-hammamet': {
    name: 'Sindbad Hotel',
    location: 'Hammamet, Tunisia',
    description: 'Luxury beachfront resort',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=400&fit=crop',
    color: 'from-blue-600 to-cyan-500',
    coordinates: { lat: 36.405378, lon: 10.598120 },
  },
  'villa-didon-carthage': {
    name: 'Villa Didon',
    location: 'Carthage, Tunisia',
    description: 'Exclusive 5-star boutique hotel on Byrsa Hill',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=400&fit=crop',
    color: 'from-violet-600 to-purple-500',
    coordinates: { lat: 36.853108, lon: 10.326584 },
  },
  'belvedere-fourati-tunis': {
    name: 'Hôtel Belvédère Fourati',
    location: 'Tunis, Tunisia',
    description: '4-star hotel in central Tunis next to Belvédère Park',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=400&fit=crop',
    color: 'from-sky-600 to-blue-500',
    coordinates: { lat: 36.815361, lon: 10.178663 },
  },
}

function getDefaultHotelSettings(hotelId: string) {
  const contacts: Record<string, { phone: string; email: string; address: string; emergencyPhone: string }> = {
    'sindbad-hammamet': {
      phone: '+216 72 280 122',
      email: 'info@sindbad-hammamet.com',
      address: 'Zone Touristique, Hammamet 8050, Tunisia',
      emergencyPhone: '+216 72 280 100',
    },
    'villa-didon-carthage': {
      phone: '+216 31 323 000',
      email: 'contact@villadidoncarthage.com',
      address: 'Rue Mendes France, Byrsa Hill, Carthage 2016, Tunisia',
      emergencyPhone: '+216 31 323 100',
    },
    'belvedere-fourati-tunis': {
      phone: '+216 71 783 133',
      email: 'reservation@hotelbelvederetunis.com',
      address: '10 Avenue des États-Unis, Belvédère, 1002 Tunis, Tunisia',
      emergencyPhone: '+216 71 783 100',
    },
  }

  return {
    name: hotelData[hotelId as HotelId]?.name || 'Hotel',
    contact: contacts[hotelId] || {
      phone: '+216 70 000 000',
      email: 'info@hotel.com',
      address: 'Tunisia',
      emergencyPhone: '+216 70 000 000',
    },
    restaurant: {
      breakfast: { start: '07:00', end: '10:00', available: true },
      lunch: { start: '12:00', end: '15:00', available: true },
      dinner: { start: '19:00', end: '22:00', available: true },
    },
    spa: { available: false, openTime: '09:00', closeTime: '20:00', treatments: ['Traditional Hammam', 'Aromatherapy Massage'] },
    pool: { openTime: '06:00', closeTime: '22:00', available: true },
    gym: { openTime: '05:00', closeTime: '23:00', available: true },
    kidsClub: { openTime: '09:00', closeTime: '17:00', available: true, ageRange: '4-12' },
    specialEvents: [],
    wifi: { available: true, password: 'Ask at reception', instructions: 'Connect to hotel WiFi network' },
    parking: { available: true, price: 'Free', instructions: 'Parking available at hotel' },
    checkIn: { time: '15:00', instructions: 'Check-in available at reception' },
    checkOut: { time: '12:00', instructions: 'Check-out at reception' },
  }
}


interface MapTag {
  name: string
  lat?: number
  lon?: number
}

interface ImageCard {
  url: string
  label?: string
}

function parseMessageContent(content: string): { text: string; imageCards: ImageCard[]; mapTags: MapTag[] } {
  const imageCards: ImageCard[] = Array.from(content.matchAll(/\[IMAGE:([^\]]+)\]/g)).map((m) => {
    const payload = m[1]
    const separatorIndex = payload.indexOf('|')
    if (separatorIndex === -1) {
      return { url: payload }
    }

    return {
      label: payload.slice(0, separatorIndex),
      url: payload.slice(separatorIndex + 1),
    }
  })

  const mapTags: MapTag[] = Array.from(content.matchAll(/\[MAP:([^\]]+)\]/g)).map((m) => {
    const parts = m[1].split('|')
    const name = parts[0]
    const lat  = parts[1] ? parseFloat(parts[1]) : undefined
    const lon  = parts[2] ? parseFloat(parts[2]) : undefined
    return { name, lat: isNaN(lat as number) ? undefined : lat, lon: isNaN(lon as number) ? undefined : lon }
  })

  const text = content
    .replace(/\n?\n?📸 \*\*[^*]+\*\*\n?\[IMAGE:[^\]]+\]/g, '')
    .replace(/\n?\[IMAGE:[^\]]+\]/g, '')
    .replace(/\n?\[MAP:[^\]]+\]/g, '')
    .trim()

  return { text, imageCards, mapTags }
}

function MapCard({
  name,
  lat,
  lon,
  hotelLat,
  hotelLon,
}: MapTag & { hotelLat: number; hotelLon: number }) {
  const hasAttractionCoords = lat !== undefined && lon !== undefined

  // Always route FROM the hotel TO the attraction
  const destination = hasAttractionCoords ? `${lat},${lon}` : encodeURIComponent(name + ', Tunisia')
  const directionsUrl = `https://www.google.com/maps/dir/${hotelLat},${hotelLon}/${destination}`

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white">
        <MapPin className="h-4 w-4 shrink-0 text-luxury-gold" />
        <span className="truncate">{name}</span>
      </div>
      <div className="px-3 py-2.5">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-luxury-outline !py-1.5 !px-3 text-xs"
        >
          <MapPin className="h-3 w-3" />
          Get directions on Google Maps
        </a>
      </div>
    </div>
  )
}

// Map app languages to BCP-47 voice locales used by the Web Speech API
const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  ar: 'ar-SA',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
}

// Strip [IMAGE:...] / [MAP:...] tags and the "📸 **Name**" labels so only
// the spoken text remains when reading an assistant reply aloud.
function getSpeakableText(content: string): string {
  return content
    .replace(/📸 \*\*[^*]+\*\*/g, '')
    .replace(/\[IMAGE:[^\]]+\]/g, '')
    .replace(/\[MAP:[^\]]+\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function HotelAssistant() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdminPreview = searchParams.get('preview') === 'admin'
  const { t, language } = useLanguage()
  const hotelId = params.id as string
  const hotel = hotelData[hotelId as HotelId]

  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<Record<string, 'positive' | 'negative'>>({})
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [hotelSettings, setHotelSettings] = useState<any>(null)
  const [pageState, setPageState] = useState<HotelPageState>(() => {
    if (isAdminPreview) {
      return {
        showRegistration: false,
        sessionId: `admin_preview_${Date.now()}`,
        guestProfile: {
          ageRange: '36-50',
          nationality: 'Tunisian',
          travelPurpose: 'leisure',
          groupType: 'couple',
        },
      }
    }
    return { showRegistration: true, sessionId: null, guestProfile: null }
  })

  // Voice feature state (browser-native, optional enhancement)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechEnabled, setSpeechEnabled] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceError, setVoiceError] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottomRef = useRef(true)
  const recognitionRef = useRef<any>(null)
  const speechEnabledRef = useRef(false)
  const languageRef = useRef(language)
  const listeningIntentRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const baseTextRef = useRef('')

  const scrollMessagesToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current

    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior })
      return
    }

    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const updateStickToBottom = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      stickToBottomRef.current = distanceFromBottom < 120
    }

    updateStickToBottom()
    container.addEventListener('scroll', updateStickToBottom)

    return () => container.removeEventListener('scroll', updateStickToBottom)
  }, [])

  const reloadHotelSettings = () => {
    if (!hotelId) return Promise.resolve()
    return fetch('/api/hotel-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (result?.success && result.data?.[hotelId]) {
          setHotelSettings(result.data[hotelId])
        } else {
          setHotelSettings(getDefaultHotelSettings(hotelId))
        }
      })
      .catch(() => setHotelSettings(getDefaultHotelSettings(hotelId)))
  }

  // Load hotel settings on mount and when the guest returns to the tab
  useEffect(() => {
    if (!hotelId || !hotel) return

    void reloadHotelSettings()

    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') {
        void reloadHotelSettings()
      }
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)

    const loadWeather = fetchLiveWeather(hotel.coordinates.lat, hotel.coordinates.lon)
      .then(setWeather)
      .catch(() => {/* weather is optional – silently ignore */})

    void loadWeather

    return () => {
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [hotelId, hotel]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hotel) return

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: t('welcomeMessage').replace('{name}', hotel.name),
        timestamp: new Date(),
      },
    ])
  }, [hotel]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update only the welcome message when language changes, without resetting the conversation
  useEffect(() => {
    if (!hotel) return
    setMessages(prev =>
      prev.map(msg =>
        msg.id === 'welcome'
          ? { ...msg, content: t('welcomeMessage').replace('{name}', hotel.name) }
          : msg
      )
    )
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!stickToBottomRef.current) {
      return
    }

    const behavior: ScrollBehavior = messages.length <= 1 && !isLoading ? 'auto' : 'smooth'
    requestAnimationFrame(() => scrollMessagesToBottom(behavior))
  }, [messages, isLoading])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const maxHeight = 160
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'

    if (stickToBottomRef.current) {
      requestAnimationFrame(() => scrollMessagesToBottom('auto'))
    }
  }, [inputMessage])

  // Keep refs in sync so speech recognition callbacks read the latest values
  useEffect(() => { speechEnabledRef.current = speechEnabled }, [speechEnabled])
  useEffect(() => { languageRef.current = language }, [language])

  // Detect browser voice capabilities once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setVoiceSupported(!!SpeechRecognition)
    setSpeechSupported('speechSynthesis' in window)

    return () => {
      listeningIntentRef.current = false
      try {
        recognitionRef.current?.abort?.()
      } catch {/* ignore */}
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const stopSpeaking = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  const speakMessage = (content: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const text = getSpeakableText(content)
    if (!text) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = SPEECH_LOCALES[languageRef.current] || 'en-US'

    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find((v) => v.lang === utterance.lang)
      || voices.find((v) => v.lang?.startsWith(utterance.lang.split('-')[0]))
    if (preferred) utterance.voice = preferred

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  const stopListening = () => {
    // User intent: stop. Prevents the auto-restart in onend.
    listeningIntentRef.current = false
    try {
      recognitionRef.current?.stop()
    } catch {/* ignore */}
    setIsListening(false)
  }

  const startListening = () => {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    // Cancel any ongoing speech so the mic does not capture the assistant voice
    stopSpeaking()
    setVoiceError('')

    // Tear down any previous instance so start() does not throw "already started"
    try {
      recognitionRef.current?.abort?.()
    } catch {/* ignore */}

    // Preserve anything already typed, then append spoken text after it.
    const existing = inputMessage.trim()
    baseTextRef.current = existing ? existing + ' ' : ''
    finalTranscriptRef.current = ''
    listeningIntentRef.current = true

    const buildRecognition = () => {
      const recognition = new SpeechRecognition()
      recognition.lang = SPEECH_LOCALES[languageRef.current] || 'en-US'
      recognition.interimResults = true
      recognition.continuous = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => setIsListening(true)

      recognition.onresult = (event: any) => {
        let interim = ''
        // Only process results from this event's starting index forward
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result[0].transcript
          if (result.isFinal) {
            finalTranscriptRef.current += text + ' '
          } else {
            interim += text
          }
        }
        setInputMessage((baseTextRef.current + finalTranscriptRef.current + interim).trimStart())
      }

      recognition.onerror = (event: any) => {
        console.error('SpeechRecognition error:', event?.error, event)
        const err = event?.error
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setVoiceError(t('voiceErrorPermission'))
          listeningIntentRef.current = false
        } else if (err === 'network') {
          setVoiceError(t('voiceErrorNetwork'))
          listeningIntentRef.current = false
        } else if (err && err !== 'aborted' && err !== 'no-speech') {
          setVoiceError(t('voiceErrorGeneric'))
        }
        // 'no-speech' and 'aborted' are non-fatal: onend will auto-restart if intended
      }

      recognition.onend = () => {
        // Auto-restart while the user still wants to dictate (continuous sessions
        // end on their own after silence in some browsers).
        if (listeningIntentRef.current) {
          try {
            recognition.start()
          } catch {
            setIsListening(false)
          }
        } else {
          setIsListening(false)
        }
      }

      return recognition
    }

    const recognition = buildRecognition()
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (e) {
      console.error('SpeechRecognition start failed:', e)
      setVoiceError(t('voiceErrorGeneric'))
      listeningIntentRef.current = false
      setIsListening(false)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const toggleSpeech = () => {
    setSpeechEnabled((prev) => {
      const next = !prev
      if (!next) stopSpeaking()
      return next
    })
  }

  const handleRegistrationComplete = (sessionId: string, profile: GuestProfile) => {
    setPageState({ showRegistration: false, sessionId, guestProfile: profile })
  }

  const handleReaction = async (messageId: string, reaction: 'positive' | 'negative') => {
    if (reactions[messageId]) return // already reacted
    setReactions(prev => ({ ...prev, [messageId]: reaction }))
    try {
      await fetch('/api/analytics/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId: hotel?.id, reaction }),
      })
    } catch {/* fire-and-forget */}
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !hotel) {
      return
    }

    // Stop microphone if it was active so it does not keep capturing
    if (isListening) stopListening()

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    const messageText = inputMessage
    const sessionId = pageState.sessionId || ''
    const hotelInfo = { id: hotelId, name: hotel.name }

    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          hotelData: hotelInfo,
          weather,
          sessionId,
          conversationHistory: messages.slice(-6).map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      const data = await response.json()

      const assistantContent = data.response || 'I apologize, I could not generate a response.'
      setMessages((prev) => ([
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date(),
        },
      ]))

      // Read the reply aloud when voice output is enabled
      if (speechEnabledRef.current) {
        speakMessage(assistantContent)
      }
    } catch (error) {
      console.error('Chat request failed:', error)
      setMessages((prev) => ([
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'I apologize, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]))
    } finally {
      setIsLoading(false)
    }
  }

  // Reservation modal state
  const [reservationModal, setReservationModal] = useState<{ open: boolean; event: any | null }>({
    open: false,
    event: null,
  })
  const [reservationForm, setReservationForm] = useState({
    guestName: '',
    phoneNumber: '',
    roomNumber: '',
    email: '',
    notes: '',
  })
  const [reservationStatus, setReservationStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [reservationError, setReservationError] = useState('')

  const openReservationModal = (event: any) => {
    setReservationModal({ open: true, event })
    setReservationForm({ guestName: '', phoneNumber: '', roomNumber: '', email: '', notes: '' })
    setReservationStatus('idle')
    setReservationError('')
  }

  const closeReservationModal = () => {
    setReservationModal({ open: false, event: null })
    setReservationStatus('idle')
  }

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reservationModal.event) return
    setReservationStatus('submitting')
    setReservationError('')
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: reservationModal.event.id,
          hotelId: hotelId,
          guestName: reservationForm.guestName,
          phoneNumber: reservationForm.phoneNumber,
          roomNumber: reservationForm.roomNumber,
          email: reservationForm.email || undefined,
          notes: reservationForm.notes || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setReservationStatus('success')
      } else {
        setReservationError(data.error || 'Reservation failed. Please try again.')
        setReservationStatus('error')
      }
    } catch {
      setReservationError('Network error. Please try again.')
      setReservationStatus('error')
    }
  }

  // Show events from today through the next 60 days
  const today = getTodayLocal()
  const upcomingEvents = (hotelSettings?.specialEvents || [])
    .map((event: any) => ({
      ...event,
      normalizedDate: normalizeEventDate(event.date),
    }))
    .filter((event: any) => event.normalizedDate && isUpcomingEvent(event.normalizedDate, today, 60))

  if (!hotel) {
    return (
      <div className="luxury-page flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-serif text-2xl font-semibold text-luxury-gold">{t('hotelNotFound')}</h1>
          <button
            onClick={() => router.push('/')}
            className="text-luxury-gold transition-colors hover:text-luxury-gold-light"
          >
            {t('returnHome')}
          </button>
        </div>
      </div>
    )
  }

  if (pageState.showRegistration) {
    return (
      <GuestRegistrationForm
        hotelId={hotelId}
        hotelName={hotel.name}
        onComplete={handleRegistrationComplete}
      />
    )
  }

  return (
    <div className="luxury-page relative overflow-x-hidden text-white z-0">

      <header className="luxury-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => router.push('/')}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.95 }}
              className="rounded-xl border border-white/10 bg-white/5 p-2 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-semibold text-luxury-gold tracking-tight">{hotel.name}</h1>
                {isAdminPreview && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                    Admin Preview
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-luxury-muted">
                <div className="w-1.5 h-1.5 rounded-full bg-luxury-gold animate-pulse" />
                <MapPin className="h-3 w-3" />
                <span>{hotel.location}</span>
              </div>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl items-start gap-4 px-4 py-6 lg:grid-cols-[340px,minmax(0,1fr)] relative z-10">
        <aside className="space-y-4">
          <div className="luxury-card overflow-hidden">
            <div className="relative h-52">
              <Image src={hotel.image} alt={hotel.name} fill sizes="(max-width: 1023px) 100vw, 340px" className="object-cover" priority unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-luxury-bg via-luxury-bg/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-luxury-gold/80">{t('hotelAssistant')}</p>
                <h2 className="font-serif text-2xl font-semibold text-white">{hotel.name}</h2>
                <p className="mt-2 text-sm text-slate-100/90">{t(`hotel_${hotelId}_desc`) || hotel.description}</p>
              </div>
            </div>
          </div>

          <div className="luxury-card p-5">
            <h3 className="mb-4 font-serif text-base font-semibold text-luxury-gold">{t('liveContext')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                  <Sun className="h-4 w-4 text-amber-300" /> {t('weatherLabel')}
                </div>
                <p className="text-sm text-slate-100">{weather ? weather.description : t('loadingWeather')}</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                  <Thermometer className="h-4 w-4 text-red-400" /> {t('tempLabel')}
                </div>
                <p className="text-sm text-gray-200">{weather ? `${weather.temperature}°C, ${t('feelsLike')} ${weather.feels_like}°C` : t('unavailable')}</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                  <Droplets className="h-4 w-4 text-luxury-gold" /> {t('humidityLabel')}
                </div>
                <p className="text-sm text-gray-200">{weather ? `${weather.humidity}%` : t('unavailable')}</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                  <Wind className="h-4 w-4 text-sky-400" /> {t('windLabel')}
                </div>
                <p className="text-sm text-gray-200">{weather ? `${weather.wind_speed} km/h` : t('unavailable')}</p>
              </div>
            </div>
          </div>

          <div className="luxury-card p-5">
            <h3 className="mb-4 font-serif text-base font-semibold text-luxury-gold">{t('hotelDetails')}</h3>
            <div className="space-y-3 text-sm text-gray-200">
              <div>
                <p className="text-gray-500">{t('checkIn')}</p>
                <p>{hotelSettings?.checkIn?.time || t('notAvailable')}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('checkOut')}</p>
                <p>{hotelSettings?.checkOut?.time || t('notAvailable')}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('frontDesk')}</p>
                <p>{hotelSettings?.contact?.phone || t('notAvailable')}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('wifi')}</p>
                <p>{hotelSettings?.wifi?.available ? t('available') : t('notAvailable')}</p>
              </div>
            </div>
          </div>

        </aside>

        <div className="space-y-4">
          <section className="luxury-card flex min-h-[32rem] max-h-[calc(100vh-8rem)] flex-col overflow-hidden">
            <div className="relative border-b border-white/10 px-6 py-4">
              <h2 className="font-serif text-lg font-semibold text-luxury-gold tracking-tight">{t('guestAssistant')}</h2>
              <p className="text-xs text-luxury-muted">
                {t('guestAssistantSub')}
              </p>
            </div>

          <div
            ref={messagesContainerRef}
            className="min-h-0 flex flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6"
          >
            {/* Spacer pushes messages to the bottom when the list is short.
                Once messages overflow the container, this shrinks to 0 and
                the scrollbar can reach every message — unlike justify-end. */}
            <div className="flex-1" />
            <div className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => {
                const parsed = parseMessageContent(message.content)
                const isAssistant = message.role === 'assistant'

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg ${
                        isAssistant ? 'chat-bubble-assistant' : 'chat-bubble-user'
                      }`}
                    >
                      {parsed.text ? (
                        <p className="whitespace-pre-wrap text-sm leading-6">{parsed.text}</p>
                      ) : null}

                      {parsed.imageCards.length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {parsed.imageCards.map((image) => (
                            <div key={`${image.label || 'photo'}-${image.url}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                              {image.label ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-200">
                                  <MapPin className="h-3.5 w-3.5 text-luxury-gold" />
                                  <span className="truncate">{image.label}</span>
                                </div>
                              ) : null}
                              <div className="relative h-52">
                              <Image
                                src={image.url}
                                alt={image.label ? `Photo of ${image.label}` : 'Photo'}
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 420px"
                                unoptimized
                              />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {parsed.mapTags.length > 0 ? (
                        <div className="space-y-2">
                          {parsed.mapTags.map((tag) => (
                            <MapCard
                              key={tag.name}
                              {...tag}
                              hotelLat={hotel.coordinates.lat}
                              hotelLon={hotel.coordinates.lon}
                            />
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isAssistant && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleReaction(message.id, 'positive')}
                              disabled={!!reactions[message.id]}
                              className={`rounded-lg p-1 transition-colors ${
                                reactions[message.id] === 'positive'
                                  ? 'text-emerald-400'
                                  : reactions[message.id]
                                  ? 'text-gray-600 cursor-not-allowed'
                                  : 'text-gray-500 hover:text-emerald-400'
                              }`}
                              title="Helpful"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleReaction(message.id, 'negative')}
                              disabled={!!reactions[message.id]}
                              className={`rounded-lg p-1 transition-colors ${
                                reactions[message.id] === 'negative'
                                  ? 'text-red-400'
                                  : reactions[message.id]
                                  ? 'text-gray-600 cursor-not-allowed'
                                  : 'text-gray-500 hover:text-red-400'
                              }`}
                              title="Not helpful"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {isLoading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-400">
                  Assistant is preparing a response...
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
            </div>{/* end messages list */}
          </div>

            <div className="border-t border-white/10 p-4 sm:p-6">
              {voiceError && (
                <div className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {voiceError}
                </div>
              )}
              {speechSupported && (
                <div className="mb-3 flex items-center justify-end gap-2">
                  {isSpeaking && (
                    <button
                      type="button"
                      onClick={stopSpeaking}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                    >
                      <Square className="h-3 w-3" />
                      {t('voiceStop')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleSpeech}
                    aria-pressed={speechEnabled}
                    title={speechEnabled ? t('voiceOutputOn') : t('voiceOutputOff')}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      speechEnabled
                        ? 'border-luxury-gold/40 bg-luxury-gold/15 text-luxury-gold'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {speechEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    {speechEnabled ? t('voiceOutputOn') : t('voiceOutputOff')}
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2 sm:gap-3">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(event) => setInputMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={t('chatPlaceholder')}
                  className="luxury-input min-h-[56px] max-h-40 flex-1 resize-none"
                  rows={1}
                />
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    aria-pressed={isListening}
                    title={isListening ? t('voiceListening') : t('voiceSpeak')}
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition hover:scale-[1.02] ${
                      isListening
                        ? 'animate-pulse border-rose-400/50 bg-rose-500/25 text-rose-200'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="btn-luxury-primary shrink-0 !h-14 !w-14 !p-0 rounded-2xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </section>

          {upcomingEvents.length > 0 && (
            <section className="luxury-card border-luxury-gold/20 p-5">
              <h3 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-luxury-gold">
                <CalendarDays className="h-5 w-5" />
                {t('upcomingEvents')}
              </h3>
              <div className="grid gap-4 xl:grid-cols-2">
                {upcomingEvents.map((event: any) => (
                  <article key={event.id || event.title} className="overflow-hidden rounded-2xl bg-white/5 border border-white/10 md:grid md:grid-cols-[220px,1fr]">
                    {event.imageUrl && (
                      <div className="relative min-h-[180px]">
                        <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-luxury-gold">{event.title}</h4>
                        {event.description && (
                          <p className="mt-2 text-sm text-slate-300">{event.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                          <span className="rounded-md bg-white/10 px-2 py-1">📅 {event.normalizedDate || t('dateTBA')}</span>
                          {event.time && <span className="rounded-md bg-white/10 px-2 py-1">🕐 {event.time}</span>}
                          {event.location && <span className="rounded-md bg-white/10 px-2 py-1">📍 {event.location}</span>}
                          {event.price && <span className="rounded-md bg-white/10 px-2 py-1">💰 {event.price}</span>}
                        </div>
                      </div>
                      {event.requiresReservation && (
                        <button
                          onClick={() => openReservationModal(event)}
                          className="btn-luxury-primary mt-4 w-full py-2 text-sm"
                        >
                          {t('reserveSpot')}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Reservation Modal */}
      <AnimatePresence>
        {reservationModal.open && reservationModal.event && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
            onClick={closeReservationModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900/95 backdrop-blur-xl p-6 shadow-2xl"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px rgba(0,0,0,0.5)' }}
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{t('reserveSpot')}</h2>
                  <p className="mt-1 text-sm text-slate-400">{reservationModal.event.title}</p>
                </div>
                <button onClick={closeReservationModal} className="rounded-full p-1 text-slate-400 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {reservationStatus === 'success' ? (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="font-semibold text-emerald-400 text-lg">Reservation submitted!</h3>
                  <p className="mt-2 text-sm text-slate-400">Our team will contact you to confirm your spot.</p>
                  <button
                    onClick={closeReservationModal}
                    className="mt-5 rounded-xl bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/20 transition"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReservationSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Full Name *</label>
                    <input
                      required
                      value={reservationForm.guestName}
                      onChange={(e) => setReservationForm(f => ({ ...f, guestName: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number *</label>
                    <input
                      required
                      type="tel"
                      value={reservationForm.phoneNumber}
                      onChange={(e) => setReservationForm(f => ({ ...f, phoneNumber: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
                      placeholder="+216 XX XXX XXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Room Number *</label>
                    <input
                      required
                      value={reservationForm.roomNumber}
                      onChange={(e) => setReservationForm(f => ({ ...f, roomNumber: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
                      placeholder="e.g. 204"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Email (optional)</label>
                    <input
                      type="email"
                      value={reservationForm.email}
                      onChange={(e) => setReservationForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
                      placeholder="john@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Notes (optional)</label>
                    <textarea
                      value={reservationForm.notes}
                      onChange={(e) => setReservationForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
                      placeholder="Any special requests..."
                    />
                  </div>

                  {reservationStatus === 'error' && (
                    <p className="text-sm text-red-400">{reservationError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={reservationStatus === 'submitting'}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reservationStatus === 'submitting' ? 'Submitting...' : 'Confirm Reservation'}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
