'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Settings, Save, LogOut, MapPin, Eye, BarChart3, ChevronRight } from 'lucide-react'

interface RestaurantSchedule {
  breakfast: { start: string; end: string; available: boolean }
  lunch: { start: string; end: string; available: boolean }
  dinner: { start: string; end: string; available: boolean }
}

interface SpaSettings {
  available: boolean
  openTime: string
  closeTime: string
  treatments: string[]
}

interface SpecialEvent {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  price?: string
  imageUrl?: string
  requiresReservation?: boolean
}

interface ContactInfo {
  phone: string
  email: string
  address: string
  emergencyPhone: string
}

interface HotelSettings {
  name: string
  restaurant: RestaurantSchedule
  spa: SpaSettings
  pool: { openTime: string; closeTime: string; available: boolean }
  gym: { openTime: string; closeTime: string; available: boolean }
  kidsClub: { openTime: string; closeTime: string; available: boolean; ageRange: string }
  specialEvents: SpecialEvent[]
  contact: ContactInfo
  wifi: { available: boolean; password?: string; instructions?: string }
  parking: { available: boolean; price?: string; instructions?: string }
  checkIn: { time: string; instructions?: string }
  checkOut: { time: string; instructions?: string }
}

const defaultSettings: { [key: string]: HotelSettings } = {
  'sindbad-hammamet': {
    name: 'Sindbad Hotel',
    restaurant: {
      breakfast: { start: '07:00', end: '10:00', available: true },
      lunch: { start: '12:00', end: '15:00', available: true },
      dinner: { start: '19:00', end: '22:00', available: true }
    },
    spa: {
      available: true,
      openTime: '09:00',
      closeTime: '20:00',
      treatments: ['Traditional Hammam', 'Aromatherapy Massage', 'Facial Treatment']
    },
    pool: { openTime: '06:00', closeTime: '22:00', available: true },
    gym: { openTime: '05:00', closeTime: '23:00', available: true },
    kidsClub: { openTime: '09:00', closeTime: '17:00', available: true, ageRange: '4-12' },
    specialEvents: [],
    contact: {
      phone: '+216 72 280 122',
      email: 'info@sindbad-hammamet.com',
      address: 'Zone Touristique, Hammamet 8050, Tunisia',
      emergencyPhone: '+216 72 280 100'
    },
    wifi: { available: true, password: 'SindbadGuest2024', instructions: 'Connect to "Sindbad_WiFi" network' },
    parking: { available: true, price: 'Free', instructions: 'Parking available in front of hotel' },
    checkIn: { time: '15:00', instructions: 'Early check-in available upon request' },
    checkOut: { time: '12:00', instructions: 'Late check-out available until 14:00 for additional fee' }
  },
  'paradise-hammamet': {
    name: 'Paradise Beach Hotel',
    restaurant: {
      breakfast: { start: '07:00', end: '10:30', available: true },
      lunch: { start: '12:30', end: '15:30', available: true },
      dinner: { start: '18:30', end: '22:30', available: true }
    },
    spa: {
      available: true,
      openTime: '09:00',
      closeTime: '20:00',
      treatments: ['Couples Massage', 'Relaxation Therapy', 'Beauty Treatments']
    },
    pool: { openTime: '06:00', closeTime: '22:00', available: true },
    gym: { openTime: '05:00', closeTime: '23:00', available: true },
    kidsClub: { openTime: '09:00', closeTime: '17:00', available: true, ageRange: '4-12' },
    specialEvents: [],
    contact: {
      phone: '+216 72 285 200',
      email: 'info@paradise-hammamet.com',
      address: 'Avenue des Nations Unies, Hammamet 8050, Tunisia',
      emergencyPhone: '+216 72 285 100'
    },
    wifi: { available: true, password: 'Paradise2024', instructions: 'Connect to "Paradise_WiFi" network' },
    parking: { available: true, price: 'Free', instructions: 'Valet parking available' },
    checkIn: { time: '14:00', instructions: 'Welcome drink included with check-in' },
    checkOut: { time: '12:00', instructions: 'Express check-out available at reception' }
  },
  'movenpick-sousse': {
    name: 'Mövenpick Sousse',
    restaurant: {
      breakfast: { start: '06:30', end: '10:00', available: true },
      lunch: { start: '12:00', end: '15:00', available: true },
      dinner: { start: '19:00', end: '23:00', available: true }
    },
    spa: {
      available: true,
      openTime: '08:00',
      closeTime: '21:00',
      treatments: ['Traditional Hammam', 'Aromatherapy', 'Hot Stone Massage']
    },
    pool: { openTime: '06:00', closeTime: '22:00', available: true },
    gym: { openTime: '00:00', closeTime: '23:59', available: true },
    kidsClub: { openTime: '09:00', closeTime: '17:00', available: false, ageRange: 'N/A' },
    specialEvents: [],
    contact: {
      phone: '+216 73 246 111',
      email: 'info@movenpick-sousse.com',
      address: 'Avenue Hedi Chaker, Sousse 4000, Tunisia',
      emergencyPhone: '+216 73 246 100'
    },
    wifi: { available: true, password: 'Movenpick2024', instructions: 'Connect to "Movenpick_WiFi" network' },
    parking: { available: true, price: '10 TND/day', instructions: 'Secure underground parking' },
    checkIn: { time: '15:00', instructions: 'Mobile check-in available via app' },
    checkOut: { time: '11:00', instructions: 'Express check-out via TV or mobile app' }
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [selectedHotel, setSelectedHotel] = useState<string>('sindbad-hammamet')
  const [settings, setSettings] = useState<{ [key: string]: HotelSettings }>(defaultSettings)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [activeTab, setActiveTab] = useState<'services' | 'events' | 'contact' | 'amenities' | 'attractions' | 'reservations'>('services')
  const [newEvent, setNewEvent] = useState<Partial<SpecialEvent>>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    price: '',
    imageUrl: '',
    requiresReservation: false,
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  // Reservations state
  const [reservations, setReservations] = useState<any[]>([])
  const [reservationsLoading, setReservationsLoading] = useState(false)
  const [reservationsError, setReservationsError] = useState('')

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    router.push('/admin/login')
  }

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/hotel-settings')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data && Object.keys(result.data).length > 0) {
            setSettings(result.data)
            return
          }
        }
      } catch (error) {
        console.error('Error loading settings from API:', error)
      }
      // Fallback to defaults if API fails
    }
    loadSettings()
  }, [])

  const saveSettings = async () => {
    setSaveStatus('saving')
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/hotel-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ hotelId: selectedHotel, settings: settings[selectedHotel] })
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.message || 'Failed to save settings')

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveStatus('idle')
      alert('Error saving settings. Please try again.')
    }
  }

  const updateHotelSettings = (hotelId: string, updates: Partial<HotelSettings>) => {
    setSettings(prev => ({
      ...prev,
      [hotelId]: { ...prev[hotelId], ...updates }
    }))
  }

  const loadReservations = async (hotelId: string) => {
    setReservationsLoading(true)
    setReservationsError('')
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`/api/admin/reservations?hotelId=${hotelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await res.json()
      if (result.success) {
        setReservations(result.data)
      } else {
        setReservationsError(result.error || 'Failed to load reservations')
      }
    } catch {
      setReservationsError('Network error loading reservations')
    } finally {
      setReservationsLoading(false)
    }
  }

  const handleStatusChange = async (reservationId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: reservationId, status: newStatus })
      })
      const result = await res.json()
      if (result.success) {
        setReservations(prev =>
          prev.map(r => r.id === reservationId ? { ...r, status: newStatus } : r)
        )
      }
    } catch {
      alert('Failed to update status')
    }
  }

  // Load reservations when tab becomes active or hotel changes
  useEffect(() => {
    if (activeTab === 'reservations') {
      loadReservations(selectedHotel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedHotel])

  const handleEventImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = await res.json()
      if (result.success) {
        setNewEvent(prev => ({ ...prev, imageUrl: result.url }))
      } else {
        alert(result.error || 'Upload failed')
      }
    } catch {
      alert('Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  const addSpecialEvent = () => {
    if (!newEvent.title || !newEvent.date) return
    
    const event: SpecialEvent = {
      id: Date.now().toString(),
      title: newEvent.title || '',
      description: newEvent.description || '',
      date: newEvent.date || '',
      time: newEvent.time || '',
      location: newEvent.location || '',
      price: newEvent.price || '',
      imageUrl: newEvent.imageUrl || '',
      requiresReservation: newEvent.requiresReservation ?? false,
    }
    
    updateHotelSettings(selectedHotel, {
      specialEvents: [...currentHotel.specialEvents, event]
    })
    
    setNewEvent({ title: '', description: '', date: '', time: '', location: '', price: '', imageUrl: '', requiresReservation: false })
  }

  const removeSpecialEvent = (eventId: string) => {
    updateHotelSettings(selectedHotel, {
      specialEvents: currentHotel.specialEvents.filter(event => event.id !== eventId)
    })
  }

  const updateTimeSlot = (service: string, field: string, value: string) => {
    if (service === 'restaurant') {
      const mealType = field.split('.')[0] as 'breakfast' | 'lunch' | 'dinner'
      const timeType = field.split('.')[1] as 'start' | 'end'
      
      updateHotelSettings(selectedHotel, {
        restaurant: {
          ...currentHotel.restaurant,
          [mealType]: {
            ...currentHotel.restaurant[mealType],
            [timeType]: value
          }
        }
      })
    } else {
      updateHotelSettings(selectedHotel, {
        [service]: {
          ...(currentHotel as any)[service],
          [field]: value
        }
      })
    }
  }

  const currentHotel = settings[selectedHotel]

  // Only show loading if currentHotel is undefined
  if (!currentHotel) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}
          >
            <Settings className="w-10 h-10 text-white" />
          </div>
          <p className="text-gray-500 font-medium">Loading hotel settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-x-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />
      </div>

      <header className="relative z-20 border-b border-white/[0.07]" style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
              >
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Hotel Dashboard</h1>
                <p className="text-xs text-gray-500">Manage settings & information</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/admin/analytics')}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveSettings}
                disabled={saveStatus === 'saving'}
                className={`flex items-center space-x-2 px-5 py-2 rounded-xl font-medium text-sm transition-all text-white disabled:opacity-50 ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-500/80 shadow-lg shadow-emerald-500/20'
                    : saveStatus === 'saving'
                    ? 'bg-white/10 cursor-not-allowed'
                    : ''
                }`}
                style={saveStatus === 'idle' ? { background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 16px rgba(99,102,241,0.3)' } : {}}
              >
                <motion.div
                  animate={saveStatus === 'saving' ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: saveStatus === 'saving' ? Infinity : 0, ease: 'linear' }}
                >
                  <Save className="w-4 h-4" />
                </motion.div>
                <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Hotel</p>
          <div className="grid md:grid-cols-3 gap-3">
            {Object.entries(settings).map(([hotelId, hotel], index) => (
              <motion.button
                key={hotelId}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedHotel(hotelId)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className={`group p-4 rounded-xl border transition-all duration-200 text-left ${
                  selectedHotel === hotelId
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                      style={selectedHotel === hotelId ? { background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 12px rgba(99,102,241,0.35)' } : { background: 'rgba(255,255,255,0.07)' }}
                    >
                      <MapPin className={`w-4 h-4 ${selectedHotel === hotelId ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <span className={`font-semibold text-sm ${selectedHotel === hotelId ? 'text-white' : 'text-gray-400'}`}>{hotel.name}</span>
                  </div>
                  {selectedHotel === hotelId && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <ChevronRight className="w-4 h-4 text-indigo-400" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="relative bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden p-6"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          {/* Tab Bar */}
          <div className="flex space-x-1 mb-6 bg-white/5 p-1 rounded-xl border border-white/10">
            {[
                    { id: 'services', label: 'Services & Hours', icon: '🕐' },
              { id: 'events', label: 'Special Events', icon: '🎉' },
              { id: 'contact', label: 'Contact Info', icon: '📞' },
              { id: 'amenities', label: 'Amenities', icon: '🏨' },
              { id: 'attractions', label: 'Attractions', icon: '🗺️' },
              { id: 'reservations', label: 'Reservations', icon: '📅' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === 'services' && (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-semibold text-white">Services & Operating Hours</h3>
              
              {/* Restaurant Section */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <h4 className="font-semibold mb-4 flex items-center space-x-2 text-white">
                  <span>🍽️</span>
                  <span>Restaurant</span>
                </h4>
                <div className="space-y-3">
                  {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                    <div 
                      key={meal} 
                      className="bg-white/5 p-4 rounded-xl border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize text-gray-200">{meal}</span>
                        <button
                          onClick={() => updateHotelSettings(selectedHotel, {
                            restaurant: {
                              ...currentHotel.restaurant,
                              [meal]: { ...currentHotel.restaurant[meal], available: !currentHotel.restaurant[meal].available }
                            }
                          })}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                            currentHotel.restaurant[meal].available 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {currentHotel.restaurant[meal].available ? 'Open' : 'Closed'}
                        </button>
                      </div>
                      {currentHotel.restaurant[meal].available && (
                        <div className="flex space-x-4 mt-3">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
                            <input
                              type="time"
                              value={currentHotel.restaurant[meal].start}
                              onChange={(e) => updateTimeSlot('restaurant', `${meal}.start`, e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
                            <input
                              type="time"
                              value={currentHotel.restaurant[meal].end}
                              onChange={(e) => updateTimeSlot('restaurant', `${meal}.end`, e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Services - Spa, Pool, Gym, Kids Club */}
              {[
                { key: 'spa', label: 'Spa', icon: '🧘', data: currentHotel.spa },
                { key: 'pool', label: 'Pool', icon: '🏊', data: currentHotel.pool },
                { key: 'gym', label: 'Gym', icon: '💪', data: currentHotel.gym },
              ].map((service) => (
                <div key={service.key} className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center space-x-2 text-white">
                      <span>{service.icon}</span>
                      <span>{service.label}</span>
                    </h4>
                    <button
                      onClick={() => updateHotelSettings(selectedHotel, {
                        [service.key]: { ...service.data, available: !service.data.available }
                      })}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                        service.data.available 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {service.data.available ? 'Open' : 'Closed'}
                    </button>
                  </div>
                  {service.data.available && (
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Open</label>
                        <input
                          type="time"
                          value={service.data.openTime}
                          onChange={(e) => updateTimeSlot(service.key, 'openTime', e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Close</label>
                        <input
                          type="time"
                          value={service.data.closeTime}
                          onChange={(e) => updateTimeSlot(service.key, 'closeTime', e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h3 className="text-lg font-semibold text-white">Special Events</h3>
              
              {/* Add New Event */}
              <div className="bg-blue-50/60 rounded-xl p-5 border border-blue-200/40">
                <h4 className="font-semibold mb-4 flex items-center space-x-2 text-white">
                  <span>➕</span>
                  <span>Add New Event</span>
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <input type="text" placeholder="Event Title" value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                  <input type="date" value={newEvent.date} onChange={(e) => setNewEvent({...newEvent, date: e.target.value})} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                  <input type="time" placeholder="Time" value={newEvent.time} onChange={(e) => setNewEvent({...newEvent, time: e.target.value})} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                  <input type="text" placeholder="Location" value={newEvent.location} onChange={(e) => setNewEvent({...newEvent, location: e.target.value})} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                  <input type="text" placeholder="Price (optional)" value={newEvent.price} onChange={(e) => setNewEvent({...newEvent, price: e.target.value})} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className={`px-3 py-2 bg-white/5 border rounded-lg text-sm text-center transition-all text-gray-300 ${newEvent.imageUrl ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 hover:border-white/20'}`}>
                        {uploadingImage ? '⏳ Uploading...' : newEvent.imageUrl ? '✅ Image added' : '📷 Add Photo'}
                      </div>
                      <input type="file" accept="image/*" onChange={handleEventImageUpload} className="hidden" disabled={uploadingImage} />
                    </label>
                    {newEvent.imageUrl && (
                      <button onClick={() => setNewEvent({...newEvent, imageUrl: ''})} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    )}
                  </div>
                </div>
                {newEvent.imageUrl && (
                  <div className="mt-3 relative w-32 h-20 rounded-lg overflow-hidden border border-white/10">
                    <img src={newEvent.imageUrl} alt="Event preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <textarea placeholder="Event Description" value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} className="w-full mt-3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" rows={3} />
                <div className="mt-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!newEvent.requiresReservation}
                      onChange={(e) => setNewEvent({ ...newEvent, requiresReservation: e.target.checked })}
                      className="w-4 h-4 rounded border-white/20 text-indigo-500 focus:ring-indigo-500 bg-white/10"
                    />
                    <span className="text-sm text-gray-200 font-medium">Requires reservation</span>
                  </label>
                  <span className="text-xs text-gray-400">(guests will see a &ldquo;Reserve a spot&rdquo; button)</span>
                </div>
                <button onClick={addSpecialEvent} disabled={!newEvent.title || !newEvent.date} className="mt-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Add Event
                </button>
              </div>

              {/* Current Events */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">Current Events</h4>
                {currentHotel.specialEvents.length === 0 ? (
                  <div className="bg-white/5 rounded-xl p-8 border border-white/10 text-center">
                    <p className="text-gray-400">No events scheduled</p>
                  </div>
                ) : (
                  currentHotel.specialEvents.map((event) => (
                    <div key={event.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 flex-1">
                          {event.imageUrl && (
                            <div className="w-24 h-16 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                              <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h5 className="font-semibold text-white">{event.title}</h5>
                            <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                              <span className="bg-white/10 px-2 py-1 rounded-md">📅 {event.date}</span>
                              {event.time && <span className="bg-white/10 px-2 py-1 rounded-md">🕐 {event.time}</span>}
                              {event.location && <span className="bg-white/10 px-2 py-1 rounded-md">📍 {event.location}</span>}
                              {event.price && <span className="bg-white/10 px-2 py-1 rounded-md">💰 {event.price}</span>}
                              {event.requiresReservation && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md">📅 Reservation required</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removeSpecialEvent(event.id)} className="text-red-400 hover:text-red-600 ml-4 p-1 hover:bg-red-50 rounded-lg transition-all">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'contact' && (
            <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h3 className="text-lg font-semibold text-white">Contact Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <label className="block text-xs font-medium text-gray-500 mb-2">Phone Number</label>
                  <input type="tel" value={currentHotel.contact.phone} onChange={(e) => updateHotelSettings(selectedHotel, { contact: { ...currentHotel.contact, phone: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                </div>
                
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <label className="block text-xs font-medium text-gray-500 mb-2">Email</label>
                  <input type="email" value={currentHotel.contact.email} onChange={(e) => updateHotelSettings(selectedHotel, { contact: { ...currentHotel.contact, email: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                </div>
                
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <label className="block text-xs font-medium text-gray-500 mb-2">Emergency Phone</label>
                  <input type="tel" value={currentHotel.contact.emergencyPhone} onChange={(e) => updateHotelSettings(selectedHotel, { contact: { ...currentHotel.contact, emergencyPhone: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                </div>
                
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <label className="block text-xs font-medium text-gray-500 mb-2">Address</label>
                  <textarea value={currentHotel.contact.address} onChange={(e) => updateHotelSettings(selectedHotel, { contact: { ...currentHotel.contact, address: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" rows={3} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'amenities' && (
            <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h3 className="text-lg font-semibold text-white">Hotel Amenities</h3>
              
              {/* WiFi */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center space-x-2 text-white">
                    <span>📶</span><span>WiFi</span>
                  </h4>
                  <button onClick={() => updateHotelSettings(selectedHotel, { wifi: { ...currentHotel.wifi, available: !currentHotel.wifi.available } })} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${currentHotel.wifi.available ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {currentHotel.wifi.available ? 'Available' : 'Not Available'}
                  </button>
                </div>
                {currentHotel.wifi.available && (
                  <div className="space-y-3">
                    <input type="text" placeholder="WiFi Password" value={currentHotel.wifi.password || ''} onChange={(e) => updateHotelSettings(selectedHotel, { wifi: { ...currentHotel.wifi, password: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                    <input type="text" placeholder="Connection Instructions" value={currentHotel.wifi.instructions || ''} onChange={(e) => updateHotelSettings(selectedHotel, { wifi: { ...currentHotel.wifi, instructions: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                  </div>
                )}
              </div>

              {/* Parking */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center space-x-2 text-white">
                    <span>🚗</span><span>Parking</span>
                  </h4>
                  <button onClick={() => updateHotelSettings(selectedHotel, { parking: { ...currentHotel.parking, available: !currentHotel.parking.available } })} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${currentHotel.parking.available ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {currentHotel.parking.available ? 'Available' : 'Not Available'}
                  </button>
                </div>
                {currentHotel.parking.available && (
                  <div className="space-y-3">
                    <input type="text" placeholder="Parking Price" value={currentHotel.parking.price || ''} onChange={(e) => updateHotelSettings(selectedHotel, { parking: { ...currentHotel.parking, price: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                    <input type="text" placeholder="Parking Instructions" value={currentHotel.parking.instructions || ''} onChange={(e) => updateHotelSettings(selectedHotel, { parking: { ...currentHotel.parking, instructions: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                  </div>
                )}
              </div>

              {/* Check-in/Check-out */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2 text-white">
                    <span>🏨</span><span>Check-in</span>
                  </h4>
                  <div className="space-y-3">
                    <input type="time" value={currentHotel.checkIn.time} onChange={(e) => updateHotelSettings(selectedHotel, { checkIn: { ...currentHotel.checkIn, time: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                    <input type="text" placeholder="Check-in Instructions" value={currentHotel.checkIn.instructions || ''} onChange={(e) => updateHotelSettings(selectedHotel, { checkIn: { ...currentHotel.checkIn, instructions: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2 text-white">
                    <span>🚪</span><span>Check-out</span>
                  </h4>
                  <div className="space-y-3">
                    <input type="time" value={currentHotel.checkOut.time} onChange={(e) => updateHotelSettings(selectedHotel, { checkOut: { ...currentHotel.checkOut, time: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                    <input type="text" placeholder="Check-out Instructions" value={currentHotel.checkOut.instructions || ''} onChange={(e) => updateHotelSettings(selectedHotel, { checkOut: { ...currentHotel.checkOut, instructions: e.target.value } })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'attractions' && (
            <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h3 className="text-lg font-semibold text-white">Nearby Attractions</h3>
              
              <div className="bg-amber-50/60 border border-amber-200/40 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-amber-800 text-sm">Database-Only Recommendations</h4>
                    <p className="text-amber-700 text-sm mt-1">
                      The chatbot only recommends attractions from this list. Add all attractions you want guests to know about.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/60 border border-blue-200/40 rounded-xl p-5">
                <h4 className="font-semibold text-blue-800 text-sm mb-2">🚧 Attractions Management Coming Soon</h4>
                <p className="text-blue-700 text-sm mb-3">
                  The enhanced attractions management system will include:
                </p>
                <ul className="text-blue-700 text-sm space-y-1 ml-4">
                  <li>• Add/edit attractions with detailed information</li>
                  <li>• Target specific guest types (couples, families, solo)</li>
                  <li>• Set weather conditions for each attraction</li>
                  <li>• Manage booking requirements and contact info</li>
                  <li>• Prioritize attractions for better recommendations</li>
                </ul>
                <p className="text-blue-600 text-sm mt-3">
                  For now, attractions are managed through the database.
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <h4 className="font-semibold mb-3 text-white text-sm">Database Schema</h4>
                <div className="bg-black/20 rounded-lg p-4 text-xs font-mono text-gray-400 space-y-1 border border-white/10">
                  <p>• attraction_name — Name of the attraction</p>
                  <p>• description — Detailed description</p>
                  <p>• category — cultural, adventure, shopping, nature, entertainment</p>
                  <p>• distance — Distance from hotel</p>
                  <p>• estimated_duration — How long the visit takes</p>
                  <p>• price_range — Cost information</p>
                  <p>• transportation — How to get there</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'reservations' && (
            <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Event Reservations</h3>
                <button
                  onClick={() => loadReservations(selectedHotel)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  ↻ Refresh
                </button>
              </div>

              {reservationsLoading && (
                <div className="text-center py-10 text-gray-400">Loading reservations...</div>
              )}

              {reservationsError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{reservationsError}</div>
              )}

              {!reservationsLoading && !reservationsError && reservations.length === 0 && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-10 text-center text-gray-500">
                  No reservations yet for this hotel.
                </div>
              )}

              {!reservationsLoading && reservations.length > 0 && (
                <div className="space-y-3">
                  {reservations.map((r: any) => (
                    <div key={r.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{r.guest_name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              r.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              r.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 font-medium mt-1">{r.event_title}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                            <span className="bg-white/10 px-2 py-1 rounded-md">📅 {r.event_date}</span>
                            {r.event_time && <span className="bg-white/10 px-2 py-1 rounded-md">🕐 {r.event_time}</span>}
                            <span className="bg-white/10 px-2 py-1 rounded-md">🏨 Room {r.room_number}</span>
                            <span className="bg-white/10 px-2 py-1 rounded-md">📞 {r.phone_number}</span>
                            {r.email && <span className="bg-white/10 px-2 py-1 rounded-md">✉️ {r.email}</span>}
                          </div>
                          {r.notes && (
                            <p className="mt-2 text-xs text-gray-400 italic">&ldquo;{r.notes}&rdquo;</p>
                          )}
                          <p className="mt-1 text-xs text-gray-400">Submitted: {new Date(r.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <select
                            value={r.status}
                            onChange={(e) => handleStatusChange(r.id, e.target.value)}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Preview Footer */}
        <div className="mt-6 relative bg-gray-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Preview Changes</h3>
              <p className="text-xs text-gray-400 mt-0.5">See how guests experience your hotel</p>
            </div>
            <a
              href={`/hotel/${selectedHotel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center space-x-2 text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Hotel</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}