'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CalendarDays, Droplets, MapPin, Send, Sun, Thermometer, Wind, X } from 'lucide-react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'

import GuestRegistrationForm, { GuestProfile } from '@/app/components/GuestRegistrationForm'
import { useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface WeatherData {
  temperature: number
  description: string
  humidity: number
  wind_speed: number
  feels_like: number
}

interface HotelPageState {
  showRegistration: boolean
  sessionId: string | null
  guestProfile: GuestProfile | null
}

type HotelId = 'sindbad-hammamet' | 'paradise-hammamet' | 'movenpick-sousse'

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
    coordinates: { lat: 36.4, lon: 10.6167 },
  },
  'paradise-hammamet': {
    name: 'Paradise Beach Hotel',
    location: 'Hammamet, Tunisia',
    description: 'Family-friendly paradise',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=400&fit=crop',
    color: 'from-emerald-600 to-teal-500',
    coordinates: { lat: 36.4, lon: 10.6167 },
  },
  'movenpick-sousse': {
    name: 'Movenpick Sousse',
    location: 'Sousse, Tunisia',
    description: 'Premium resort in historic Sousse',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop',
    color: 'from-amber-600 to-orange-500',
    coordinates: { lat: 35.8256, lon: 10.6411 },
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
    'paradise-hammamet': {
      phone: '+216 72 285 200',
      email: 'info@paradise-hammamet.com',
      address: 'Avenue des Nations Unies, Hammamet 8050, Tunisia',
      emergencyPhone: '+216 72 285 100',
    },
    'movenpick-sousse': {
      phone: '+216 73 246 111',
      email: 'info@movenpick-sousse.com',
      address: 'Avenue Hedi Chaker, Sousse 4000, Tunisia',
      emergencyPhone: '+216 73 246 100',
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

function getWeatherDescription(code: number): string {
  const codes: Record<number, string> = {
    0: 'clear sky',
    1: 'mainly clear',
    2: 'partly cloudy',
    3: 'overcast',
    45: 'fog',
    51: 'light drizzle',
    61: 'slight rain',
    63: 'moderate rain',
    65: 'heavy rain',
    71: 'slight snow',
    80: 'rain showers',
    95: 'thunderstorm',
  }

  return codes[code] || 'unknown'
}

function parseMessageContent(content: string): { text: string; imageUrls: string[] } {
  const imageUrls = Array.from(content.matchAll(/\[IMAGE:([^\]]+)\]/g)).map((match) => match[1])
  const text = content.replace(/\n?\[IMAGE:[^\]]+\]/g, '').trim()
  return { text, imageUrls }
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeEventDate(value: unknown): string | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    const isoDateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
    if (isoDateMatch) {
      return isoDateMatch[1]
    }

    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : formatDateOnly(parsed)
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : formatDateOnly(value)
  }

  return null
}

export default function HotelAssistant() {
  const params = useParams()
  const router = useRouter()
  const { t, language } = useLanguage()
  const hotelId = params.id as string
  const hotel = hotelData[hotelId as HotelId]

  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [hotelSettings, setHotelSettings] = useState<any>(null)
  const [pageState, setPageState] = useState<HotelPageState>({
    showRegistration: true,
    sessionId: null,
    guestProfile: null,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottomRef = useRef(true)

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

  useEffect(() => {
    if (!hotelId) return

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/hotel-settings')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data?.[hotelId]) {
            setHotelSettings(result.data[hotelId])
            return
          }
        }
      } catch (error) {
        console.error('Failed to load hotel settings:', error)
      }

      setHotelSettings(getDefaultHotelSettings(hotelId))
    }

    loadSettings()
  }, [hotelId])

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

    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${hotel.coordinates.lat}&longitude=${hotel.coordinates.lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`
        )
        const data = await response.json()
        const currentWeather = data.current_weather

        setWeather({
          temperature: currentWeather.temperature,
          description: getWeatherDescription(currentWeather.weathercode),
          humidity: data.hourly.relative_humidity_2m[0],
          wind_speed: currentWeather.windspeed,
          feels_like: currentWeather.temperature + 2,
        })
      } catch (error) {
        console.error('Failed to load weather:', error)
      }
    }

    fetchWeather()
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

  const handleRegistrationComplete = (sessionId: string, profile: GuestProfile) => {
    setPageState({ showRegistration: false, sessionId, guestProfile: profile })
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !hotel) {
      return
    }

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

      setMessages((prev) => ([
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response || 'I apologize, I could not generate a response.',
          timestamp: new Date(),
        },
      ]))
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

  // Compute upcoming events (within 10 days)
  const today = normalizeEventDate(new Date())
  const upcomingEvents = (hotelSettings?.specialEvents || [])
    .map((event: any) => ({
      ...event,
      normalizedDate: normalizeEventDate(event.date),
    }))
    .filter((event: any) => {
      if (!event.normalizedDate || !today) return false
      const eventDate = new Date(`${event.normalizedDate}T00:00:00`)
      const currentDate = new Date(`${today}T00:00:00`)
      const diffDays = (eventDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      return diffDays >= -1 && diffDays <= 10
    })

  if (!hotel) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{t('hotelNotFound')}</h1>
          <button
            onClick={() => router.push('/')}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
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
    <div className="min-h-screen bg-gray-950 text-white relative overflow-x-hidden">

      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/[0.07]" style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(20px)' }}>
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
              <h1 className="text-xl font-bold tracking-tight">{hotel.name}</h1>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/70 backdrop-blur-xl" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)' }}>
            <div className="relative h-52">
              <Image src={hotel.image} alt={hotel.name} fill sizes="(max-width: 1023px) 100vw, 340px" className="object-cover" priority />
              <div className={`absolute inset-0 bg-gradient-to-t ${hotel.color} opacity-50`} />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-white/70">{t('hotelAssistant')}</p>
                <h2 className="text-2xl font-semibold">{hotel.name}</h2>
                <p className="mt-2 text-sm text-slate-100/90">{hotel.description}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gray-900/70 backdrop-blur-xl p-5" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 className="mb-4 text-base font-semibold text-white">{t('liveContext')}</h3>
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
                  <Droplets className="h-4 w-4 text-cyan-400" /> {t('humidityLabel')}
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

          <div className="rounded-2xl border border-white/10 bg-gray-900/70 backdrop-blur-xl p-5" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 className="mb-4 text-base font-semibold text-white">{t('hotelDetails')}</h3>
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
          <section className="flex min-h-[32rem] max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-900/70 backdrop-blur-xl" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)' }}>
            <div className="relative border-b border-white/10 px-6 py-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <h2 className="text-base font-bold text-white tracking-tight">{t('guestAssistant')}</h2>
              <p className="text-xs text-gray-500">
                {t('guestAssistantSub')}
              </p>
            </div>

          <div
            ref={messagesContainerRef}
            className="min-h-0 flex flex-1 flex-col justify-end gap-4 overflow-y-auto px-4 py-5 sm:px-6"
          >
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
                        isAssistant
                          ? 'border border-white/10 bg-white/5 backdrop-blur-sm text-gray-100'
                          : 'text-white'
                      }`}
                      style={!isAssistant ? { background: 'linear-gradient(135deg, #6366F1, #06B6D4)' } : {}}
                    >
                      {parsed.text ? (
                        <p className="whitespace-pre-wrap text-sm leading-6">{parsed.text}</p>
                      ) : null}

                      {parsed.imageUrls.length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {parsed.imageUrls.map((url) => (
                            <div key={url} className="relative h-48 overflow-hidden rounded-2xl">
                              <Image
                                src={url}
                                alt="Event"
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 420px"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-2 text-xs text-slate-400">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {message.isStreaming ? ' · streaming' : ''}
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
          </div>

            <div className="border-t border-white/10 p-4 sm:p-6">
              <div className="flex gap-3">
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
                  className="min-h-[56px] max-h-40 flex-1 resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-400"
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 16px rgba(99,102,241,0.3)' }}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </section>

          {upcomingEvents.length > 0 && (
            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-xl p-5" style={{ boxShadow: '0 0 0 1px rgba(245,158,11,0.05)' }}>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <CalendarDays className="h-5 w-5 text-amber-400" />
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
                        <h4 className="font-semibold text-amber-200">{event.title}</h4>
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
                          className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
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
