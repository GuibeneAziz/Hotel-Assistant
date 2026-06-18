'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Save, MapPin, Eye, ChevronRight, Plus, Trash2, RefreshCw } from 'lucide-react'
import AdminShell from '@/app/components/admin/AdminShell'
import OperatingHoursPanel from '@/app/components/admin/OperatingHoursPanel'

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
  weekendOpenTime?: string
  weekendCloseTime?: string
  bookingRequired?: boolean
}

interface ReceptionSettings {
  openTime: string
  closeTime: string
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
  pool: {
    openTime: string
    closeTime: string
    available: boolean
    barOpenTime?: string
    barCloseTime?: string
    maintenanceNote?: string
    seasonLabel?: string
  }
  reception?: ReceptionSettings
  restaurantDisplayName?: string
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
      closeTime: '21:00',
      weekendOpenTime: '08:00',
      weekendCloseTime: '22:00',
      bookingRequired: true,
      treatments: ['Traditional Hammam', 'Aromatherapy Massage', 'Facial Treatment']
    },
    pool: {
      openTime: '06:00',
      closeTime: '22:00',
      barOpenTime: '06:00',
      barCloseTime: '22:00',
      available: true,
      seasonLabel: 'SUMMER SEASON',
      maintenanceNote: 'Maintenance scheduled for next Tuesday, 04:00 – 08:00.',
    },
    reception: { openTime: '08:00', closeTime: '23:00' },
    restaurantDisplayName: 'The Gilded Plate',
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
  'villa-didon-carthage': {
    name: 'Villa Didon',
    restaurant: {
      breakfast: { start: '07:30', end: '10:30', available: true },
      lunch: { start: '12:30', end: '15:30', available: true },
      dinner: { start: '19:30', end: '22:30', available: true }
    },
    spa: {
      available: true,
      openTime: '09:00',
      closeTime: '21:00',
      weekendOpenTime: '08:00',
      weekendCloseTime: '22:00',
      bookingRequired: true,
      treatments: ['Hammam Royal', 'Thalassotherapy', 'Aromatherapy Massage', 'Reflexology']
    },
    pool: {
      openTime: '08:00',
      closeTime: '20:00',
      barOpenTime: '10:00',
      barCloseTime: '22:00',
      available: true,
      seasonLabel: 'SUMMER SEASON',
      maintenanceNote: 'Maintenance scheduled for next Tuesday, 04:00 – 08:00.',
    },
    reception: { openTime: '08:00', closeTime: '23:00' },
    restaurantDisplayName: 'La Terrasse',
    gym: { openTime: '06:00', closeTime: '22:00', available: true },
    kidsClub: { openTime: '09:00', closeTime: '17:00', available: false, ageRange: 'N/A' },
    specialEvents: [],
    contact: {
      phone: '+216 31 323 000',
      email: 'contact@villadidoncarthage.com',
      address: 'Rue Mendes France, Byrsa Hill, Carthage 2016, Tunisia',
      emergencyPhone: '+216 31 323 100'
    },
    wifi: { available: true, password: 'VillaDidon2024', instructions: 'Connect to "VillaDidon_Guest" — password at check-in' },
    parking: { available: true, price: 'Free valet', instructions: 'Valet parking available 24h' },
    checkIn: { time: '14:00', instructions: 'Early check-in from 11:00 subject to availability' },
    checkOut: { time: '12:00', instructions: 'Late check-out until 15:00 on request' }
  },
  'belvedere-fourati-tunis': {
    name: 'Hôtel Belvédère Fourati',
    restaurant: {
      breakfast: { start: '07:00', end: '10:30', available: true },
      lunch: { start: '12:00', end: '15:00', available: true },
      dinner: { start: '19:00', end: '22:30', available: true }
    },
    spa: {
      available: false,
      openTime: '00:00',
      closeTime: '00:00',
      weekendOpenTime: '08:00',
      weekendCloseTime: '22:00',
      bookingRequired: false,
      treatments: []
    },
    pool: {
      openTime: '07:00',
      closeTime: '21:00',
      barOpenTime: '09:00',
      barCloseTime: '20:00',
      available: true,
      seasonLabel: 'SUMMER SEASON',
      maintenanceNote: 'Maintenance scheduled for next Tuesday, 04:00 – 08:00.',
    },
    reception: { openTime: '08:00', closeTime: '23:00' },
    restaurantDisplayName: 'Le Restaurant',
    gym: { openTime: '06:00', closeTime: '23:00', available: true },
    kidsClub: { openTime: '09:00', closeTime: '17:00', available: false, ageRange: 'N/A' },
    specialEvents: [],
    contact: {
      phone: '+216 71 783 133',
      email: 'reservation@hotelbelvederetunis.com',
      address: '10 Avenue des États-Unis, Belvédère, 1002 Tunis, Tunisia',
      emergencyPhone: '+216 71 783 100'
    },
    wifi: { available: true, password: 'Belvedere2024', instructions: 'Free WiFi throughout — ask reception for the password' },
    parking: { available: true, price: 'Free', instructions: 'Free covered parking on-site, 24h access' },
    checkIn: { time: '14:00', instructions: 'Express check-in available; ID required' },
    checkOut: { time: '12:00', instructions: 'Late check-out until 14:00 for a small fee' }
  }
}

const VALID_TABS = ['services', 'events', 'contact', 'amenities', 'attractions', 'reservations'] as const

function AdminDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // Attractions state
  const [attractions, setAttractions] = useState<any[]>([])
  const [attractionsLoading, setAttractionsLoading] = useState(false)
  const [attractionsError, setAttractionsError] = useState('')
  const [attractionSaving, setAttractionSaving] = useState(false)
  const [newAttraction, setNewAttraction] = useState({
    attraction_name: '', description: '', category: 'cultural',
    distance: '', estimated_duration: '', price_range: '', transportation: '', image_url: '',
  })
  // Inline photo editing: maps attraction id → draft URL string
  const [photoEditing, setPhotoEditing] = useState<Record<number, string>>({})

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    router.push('/admin/login')
  }

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && (VALID_TABS as readonly string[]).includes(tab)) {
      setActiveTab(tab as (typeof VALID_TABS)[number])
    }
  }, [searchParams])

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

  const persistHotelSettings = async (hotelId: string, hotelSettings: HotelSettings) => {
    setSaveStatus('saving')
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/hotel-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ hotelId, settings: hotelSettings })
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.message || 'Failed to save settings')

      const reload = await fetch('/api/hotel-settings')
      if (reload.ok) {
        const fresh = await reload.json()
        if (fresh.success && fresh.data) {
          setSettings(fresh.data)
        }
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveStatus('idle')
      alert('Error saving settings. Please try again.')
      return false
    }
  }

  const saveSettings = async () => {
    if (!settings[selectedHotel]) return
    await persistHotelSettings(selectedHotel, settings[selectedHotel])
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

  const loadAttractions = useCallback(async (hotelId: string) => {
    setAttractionsLoading(true)
    setAttractionsError('')
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`/api/admin/attractions?hotelId=${hotelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await res.json()
      if (result.success) setAttractions(result.data)
      else setAttractionsError(result.error || 'Failed to load attractions')
    } catch {
      setAttractionsError('Network error loading attractions')
    } finally {
      setAttractionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'attractions') loadAttractions(selectedHotel)
  }, [activeTab, selectedHotel, loadAttractions])

  const addAttraction = async () => {
    if (!newAttraction.attraction_name || !newAttraction.category) return
    setAttractionSaving(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/attractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hotelId: selectedHotel, ...newAttraction }),
      })
      const result = await res.json()
      if (result.success) {
        setAttractions(prev => [...prev.filter(a => a.id !== result.data.id), result.data]
          .sort((a, b) => a.category.localeCompare(b.category) || a.attraction_name.localeCompare(b.attraction_name)))
        setNewAttraction({ attraction_name: '', description: '', category: 'cultural', distance: '', estimated_duration: '', price_range: '', transportation: '', image_url: '' })
      } else {
        alert(result.error || 'Failed to save attraction')
      }
    } catch {
      alert('Network error')
    } finally {
      setAttractionSaving(false)
    }
  }

  const deleteAttraction = async (id: number) => {
    if (!confirm('Delete this attraction?')) return
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`/api/admin/attractions?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()
      if (result.success) setAttractions(prev => prev.filter(a => a.id !== id))
      else alert(result.error || 'Failed to delete')
    } catch {
      alert('Network error')
    }
  }

  const saveAttractionPhoto = async (attraction: any) => {
    const image_url = photoEditing[attraction.id]?.trim() || ''
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/attractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          hotelId: selectedHotel,
          attraction_name: attraction.attraction_name,
          description: attraction.description,
          category: attraction.category,
          distance: attraction.distance,
          estimated_duration: attraction.estimated_duration,
          price_range: attraction.price_range,
          transportation: attraction.transportation,
          image_url,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setAttractions(prev => prev.map(a => a.id === attraction.id ? { ...a, image_url } : a))
        setPhotoEditing(prev => { const n = { ...prev }; delete n[attraction.id]; return n })
      } else {
        alert(result.error || 'Failed to save photo')
      }
    } catch {
      alert('Network error')
    }
  }

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

  const addSpecialEvent = async () => {
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

    const nextSettings: HotelSettings = {
      ...currentHotel,
      specialEvents: [...currentHotel.specialEvents, event],
    }

    updateHotelSettings(selectedHotel, { specialEvents: nextSettings.specialEvents })
    setNewEvent({ title: '', description: '', date: '', time: '', location: '', price: '', imageUrl: '', requiresReservation: false })

    await persistHotelSettings(selectedHotel, nextSettings)
  }

  const removeSpecialEvent = async (eventId: string) => {
    const nextSettings: HotelSettings = {
      ...currentHotel,
      specialEvents: currentHotel.specialEvents.filter(event => event.id !== eventId),
    }

    updateHotelSettings(selectedHotel, { specialEvents: nextSettings.specialEvents })
    await persistHotelSettings(selectedHotel, nextSettings)
  }

  const resetOperatingHours = () => {
    const defaults = defaultSettings[selectedHotel]
    if (!defaults) return
    updateHotelSettings(selectedHotel, {
      restaurant: JSON.parse(JSON.stringify(defaults.restaurant)),
      spa: JSON.parse(JSON.stringify(defaults.spa)),
      pool: JSON.parse(JSON.stringify(defaults.pool)),
      gym: JSON.parse(JSON.stringify(defaults.gym)),
      kidsClub: JSON.parse(JSON.stringify(defaults.kidsClub)),
      reception: defaults.reception ? { ...defaults.reception } : { openTime: '08:00', closeTime: '23:00' },
      restaurantDisplayName: defaults.restaurantDisplayName,
    })
  }

  const currentHotel = settings[selectedHotel]

  // Only show loading if currentHotel is undefined
  if (!currentHotel) {
    return (
      <div className="luxury-page flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-2xl bg-luxury-gold shadow-lg shadow-luxury-gold/25">
            <Settings className="h-10 w-10 text-luxury-bg" />
          </div>
          <p className="font-medium text-luxury-muted">Loading hotel settings...</p>
        </div>
      </div>
    )
  }

  const saveHeaderAction = (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={saveSettings}
      disabled={saveStatus === 'saving'}
      className={`flex items-center gap-2 !min-h-0 rounded-xl px-5 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
        saveStatus === 'saved'
          ? 'bg-emerald-500/80 text-white'
          : saveStatus === 'saving'
          ? 'cursor-not-allowed bg-white/10 text-white'
          : 'btn-luxury-primary !py-2'
      }`}
    >
      <motion.div
        animate={saveStatus === 'saving' ? { rotate: 360 } : {}}
        transition={{ duration: 1, repeat: saveStatus === 'saving' ? Infinity : 0, ease: 'linear' }}
      >
        <Save className="h-4 w-4" />
      </motion.div>
      <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}</span>
    </motion.button>
  )

  return (
    <AdminShell
      pageTitle="Hotel Dashboard"
      pageDescription="Manage hotel information, services, special events, and guest reservations across your properties."
      headerActions={saveHeaderAction}
      onLogout={handleLogout}
    >
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-luxury-muted">Select property</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {Object.entries(settings).map(([hotelId, hotel], index) => (
              <motion.button
                key={hotelId}
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedHotel(hotelId)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.04 }}
                className={`admin-hotel-card min-w-[200px] flex-1 sm:max-w-[280px] ${
                  selectedHotel === hotelId ? 'admin-hotel-card-active' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      selectedHotel === hotelId ? 'bg-luxury-gold text-luxury-bg' : 'bg-white/10 text-luxury-muted'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className={`truncate text-sm font-semibold ${selectedHotel === hotelId ? 'text-luxury-gold' : 'text-white'}`}>
                      {hotel.name}
                    </p>
                    <p className="truncate text-xs text-luxury-muted">Tunisia</p>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 ${selectedHotel === hotelId ? 'text-luxury-gold' : 'text-luxury-muted'}`} />
              </motion.button>
            ))}
          </div>
        </motion.section>

        <div className="admin-tabs-row">
          {[
            { id: 'services', label: 'Services & Hours' },
            { id: 'events', label: 'Special Events' },
            { id: 'contact', label: 'Contact Info' },
            { id: 'amenities', label: 'Amenities' },
            { id: 'attractions', label: 'Attractions' },
            { id: 'reservations', label: 'Reservations' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`admin-tab-pill ${activeTab === tab.id ? 'admin-tab-pill-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <motion.div
          className={activeTab === 'services' ? 'admin-content-panel--flush' : 'admin-content-panel'}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >

          {activeTab === 'services' && (
            <OperatingHoursPanel
              hotel={{
                name: currentHotel.name,
                restaurantDisplayName: currentHotel.restaurantDisplayName,
                restaurant: currentHotel.restaurant,
                spa: currentHotel.spa,
                pool: currentHotel.pool,
                gym: currentHotel.gym,
                kidsClub: currentHotel.kidsClub,
                reception: currentHotel.reception,
              }}
              onUpdate={(updates) => updateHotelSettings(selectedHotel, updates)}
              onSave={saveSettings}
              onReset={resetOperatingHours}
              saveStatus={saveStatus}
            />
          )}

          {activeTab === 'events' && (
            <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <h3 className="text-lg font-semibold text-white">Special Events</h3>
              
              {/* Add New Event */}
              <div className="luxury-card border border-luxury-gold/20 p-5">
                <h4 className="font-semibold mb-4 flex items-center space-x-2 text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-luxury-gold/20 text-base">🎉</span>
                  <span>Add New Event</span>
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <input type="text" placeholder="Event Title" value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} className="input-admin" />
                  <input type="date" value={newEvent.date} onChange={(e) => setNewEvent({...newEvent, date: e.target.value})} className="input-admin" />
                  <input type="time" placeholder="Time" value={newEvent.time} onChange={(e) => setNewEvent({...newEvent, time: e.target.value})} className="input-admin" />
                  <input type="text" placeholder="Location" value={newEvent.location} onChange={(e) => setNewEvent({...newEvent, location: e.target.value})} className="input-admin" />
                  <input type="text" placeholder="Price (optional)" value={newEvent.price} onChange={(e) => setNewEvent({...newEvent, price: e.target.value})} className="input-admin" />
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
                <textarea placeholder="Event Description" value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} className="input-admin mt-3 w-full" rows={3} />
                <p className="mt-2 text-xs text-slate-400">Events are saved automatically when you add or remove them.</p>
                <div className="mt-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!newEvent.requiresReservation}
                      onChange={(e) => setNewEvent({ ...newEvent, requiresReservation: e.target.checked })}
                      className="h-4 w-4 rounded border-white/20 bg-white/10 text-luxury-gold focus:ring-luxury-gold"
                    />
                    <span className="text-sm text-gray-200 font-medium">Requires reservation</span>
                  </label>
                  <span className="text-xs text-gray-400">(guests will see a &ldquo;Reserve a spot&rdquo; button)</span>
                </div>
                <button
                  onClick={addSpecialEvent}
                  disabled={!newEvent.title || !newEvent.date}
                  className="btn-luxury-primary mt-3 flex items-center space-x-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Event</span>
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
                                <span className="rounded-md border border-luxury-gold/25 bg-luxury-gold/15 px-2 py-1 text-luxury-gold">📅 Reservation required</span>
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
                  <input type="tel" value={currentHotel.contact.phone} onChange={(e) => updateHotelSettings(selectedHotel, { contact: { ...currentHotel.contact, phone: e.target.value } })} className="input-admin" />
                </div>
                
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <label className="block text-xs font-medium text-gray-500 mb-2">Email</label>
                  <input type="email" value={currentHotel.contact.email} onChange={(e) => updateHotelSettings(selectedHotel, { contact: { ...currentHotel.contact, email: e.target.value } })} className="input-admin" />
                </div>
                
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <label className="block text-xs font-medium text-gray-500 mb-2">Emergency Phone</label>
                  <input type="tel" value={currentHotel.contact.emergencyPhone} onChange={(e) => updateHotelSettings(selectedHotel, { contact: { ...currentHotel.contact, emergencyPhone: e.target.value } })} className="input-admin" />
                </div>
                
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <label className="block text-xs font-medium text-gray-500 mb-2">Address</label>
                  <textarea value={currentHotel.contact.address} onChange={(e) => updateHotelSettings(selectedHotel, { contact: { ...currentHotel.contact, address: e.target.value } })} className="input-admin" rows={3} />
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
                    <input type="text" placeholder="WiFi Password" value={currentHotel.wifi.password || ''} onChange={(e) => updateHotelSettings(selectedHotel, { wifi: { ...currentHotel.wifi, password: e.target.value } })} className="input-admin" />
                    <input type="text" placeholder="Connection Instructions" value={currentHotel.wifi.instructions || ''} onChange={(e) => updateHotelSettings(selectedHotel, { wifi: { ...currentHotel.wifi, instructions: e.target.value } })} className="input-admin" />
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
                    <input type="text" placeholder="Parking Price" value={currentHotel.parking.price || ''} onChange={(e) => updateHotelSettings(selectedHotel, { parking: { ...currentHotel.parking, price: e.target.value } })} className="input-admin" />
                    <input type="text" placeholder="Parking Instructions" value={currentHotel.parking.instructions || ''} onChange={(e) => updateHotelSettings(selectedHotel, { parking: { ...currentHotel.parking, instructions: e.target.value } })} className="input-admin" />
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
                    <input type="time" value={currentHotel.checkIn.time} onChange={(e) => updateHotelSettings(selectedHotel, { checkIn: { ...currentHotel.checkIn, time: e.target.value } })} className="input-admin" />
                    <input type="text" placeholder="Check-in Instructions" value={currentHotel.checkIn.instructions || ''} onChange={(e) => updateHotelSettings(selectedHotel, { checkIn: { ...currentHotel.checkIn, instructions: e.target.value } })} className="input-admin" />
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2 text-white">
                    <span>🚪</span><span>Check-out</span>
                  </h4>
                  <div className="space-y-3">
                    <input type="time" value={currentHotel.checkOut.time} onChange={(e) => updateHotelSettings(selectedHotel, { checkOut: { ...currentHotel.checkOut, time: e.target.value } })} className="input-admin" />
                    <input type="text" placeholder="Check-out Instructions" value={currentHotel.checkOut.instructions || ''} onChange={(e) => updateHotelSettings(selectedHotel, { checkOut: { ...currentHotel.checkOut, instructions: e.target.value } })} className="input-admin" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'attractions' && (
            <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              {/* Header row */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Nearby Attractions</h3>
                <button
                  onClick={() => loadAttractions(selectedHotel)}
                  disabled={attractionsLoading}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-white/10 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${attractionsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Info banner */}
              <div className="flex items-start space-x-3 rounded-xl p-4 border border-amber-500/20" style={{ background: 'rgba(245,158,11,0.06)' }}>
                <span className="text-lg">💡</span>
                <p className="text-sm text-amber-300/80">
                  The AI chatbot only recommends attractions from this list. Keep it up to date so guests get accurate, personalised suggestions.
                </p>
              </div>

              {/* ── Add new attraction form ─────────────────────────────────────── */}
              <div className="luxury-card space-y-4 border border-luxury-gold/20 p-5">
                <h4 className="font-semibold flex items-center space-x-2 text-white text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-luxury-gold/20 text-base">🗺️</span>
                  <span>Add New Attraction</span>
                </h4>

                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Attraction name *"
                    value={newAttraction.attraction_name}
                    onChange={e => setNewAttraction(p => ({ ...p, attraction_name: e.target.value }))}
                    className="input-admin"
                  />
                  <select
                    value={newAttraction.category}
                    onChange={e => setNewAttraction(p => ({ ...p, category: e.target.value }))}
                    className="input-admin"
                  >
                    {['cultural','nature','adventure','entertainment','shopping','restaurant','cafe'].map(c => (
                      <option key={c} value={c} className="bg-gray-900 capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Distance (e.g. 2 km)"
                    value={newAttraction.distance}
                    onChange={e => setNewAttraction(p => ({ ...p, distance: e.target.value }))}
                    className="input-admin"
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g. 1-2 hours)"
                    value={newAttraction.estimated_duration}
                    onChange={e => setNewAttraction(p => ({ ...p, estimated_duration: e.target.value }))}
                    className="input-admin"
                  />
                  <input
                    type="text"
                    placeholder="Price range (e.g. Free, 10-20 TND)"
                    value={newAttraction.price_range}
                    onChange={e => setNewAttraction(p => ({ ...p, price_range: e.target.value }))}
                    className="input-admin"
                  />
                  <input
                    type="text"
                    placeholder="Transportation (e.g. Taxi, Walking)"
                    value={newAttraction.transportation}
                    onChange={e => setNewAttraction(p => ({ ...p, transportation: e.target.value }))}
                    className="input-admin"
                  />
                </div>

                <textarea
                  placeholder="Description — what makes this attraction special? (recommended)"
                  value={newAttraction.description}
                  onChange={e => setNewAttraction(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="input-admin w-full resize-none"
                />

                {/* Image URL input with live thumbnail preview */}
                <div className="space-y-2">
                  <input
                    type="url"
                    placeholder="Photo URL (e.g. https://upload.wikimedia.org/…) — optional"
                    value={newAttraction.image_url}
                    onChange={e => setNewAttraction(p => ({ ...p, image_url: e.target.value }))}
                    className="input-admin w-full"
                  />
                  {newAttraction.image_url && (
                    <div className="relative h-32 w-full overflow-hidden rounded-xl border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={newAttraction.image_url}
                        alt="Preview"
                        className="h-full w-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={addAttraction}
                  disabled={!newAttraction.attraction_name || !newAttraction.category || attractionSaving}
                  className="btn-luxury-primary flex items-center space-x-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {attractionSaving
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Plus className="w-4 h-4" />
                  }
                  <span>{attractionSaving ? 'Saving…' : 'Add Attraction'}</span>
                </button>
              </div>

              {/* ── Attractions list ─────────────────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {attractionsLoading ? 'Loading…' : `${attractions.length} attraction${attractions.length !== 1 ? 's' : ''}`}
                  </p>
                </div>

                {attractionsError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">{attractionsError}</div>
                )}

                {!attractionsLoading && !attractionsError && attractions.length === 0 && (
                  <div className="bg-white/5 rounded-xl p-8 border border-white/10 text-center text-gray-500">
                    No attractions added yet. Use the form above to add the first one.
                  </div>
                )}

                {/* Group by category */}
                {!attractionsLoading && (() => {
                  const categories = [...new Set(attractions.map(a => a.category))].sort()
                  const categoryEmoji: Record<string, string> = {
                    cultural: '🏛️', nature: '🌿', adventure: '🏄', entertainment: '🎭',
                    shopping: '🛍️', restaurant: '🍽️', cafe: '☕',
                  }
                  return categories.map(cat => (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2 flex items-center space-x-1.5">
                        <span>{categoryEmoji[cat] ?? '📍'}</span>
                        <span>{cat}</span>
                        <span className="text-gray-600">({attractions.filter(a => a.category === cat).length})</span>
                      </p>
                      <AnimatePresence>
                        {attractions.filter(a => a.category === cat).map(a => (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white/5 rounded-xl p-4 border border-white/10 mb-2 hover:border-white/20 transition-all"
                          >
                            <div className="flex items-start gap-3">
                              {/* Thumbnail */}
                              {a.image_url && (
                                <div className="flex-shrink-0 h-16 w-20 overflow-hidden rounded-lg border border-white/10">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={a.image_url} alt={a.attraction_name} className="h-full w-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{a.attraction_name}</p>
                                {a.description && (
                                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{a.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {a.distance && (
                                    <span className="bg-white/10 px-2 py-0.5 rounded-md text-xs text-gray-400">📍 {a.distance}</span>
                                  )}
                                  {a.estimated_duration && (
                                    <span className="bg-white/10 px-2 py-0.5 rounded-md text-xs text-gray-400">🕐 {a.estimated_duration}</span>
                                  )}
                                  {a.price_range && (
                                    <span className="bg-white/10 px-2 py-0.5 rounded-md text-xs text-gray-400">💰 {a.price_range}</span>
                                  )}
                                  {a.transportation && (
                                    <span className="bg-white/10 px-2 py-0.5 rounded-md text-xs text-gray-400">🚗 {a.transportation}</span>
                                  )}
                                  {!a.image_url && (
                                    <span className="bg-yellow-500/10 px-2 py-0.5 rounded-md text-xs text-yellow-500/70">No photo</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 flex-shrink-0">
                                <button
                                  onClick={() => setPhotoEditing(prev =>
                                    prev[a.id] !== undefined
                                      ? (({ [a.id]: _, ...rest }) => rest)(prev)
                                      : { ...prev, [a.id]: a.image_url || '' }
                                  )}
                                  className="rounded-lg p-1.5 text-xs text-gray-500 transition-all hover:bg-luxury-gold/10 hover:text-luxury-gold"
                                  title={a.image_url ? 'Change photo' : 'Add photo'}
                                >
                                  📷
                                </button>
                                <button
                                  onClick={() => deleteAttraction(a.id)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  title="Delete attraction"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Inline photo editor — shown when 📷 is clicked */}
                            {photoEditing[a.id] !== undefined && (
                              <div className="mt-2 space-y-2 rounded-xl border border-luxury-gold/30 bg-white/5 p-3">
                                <p className="text-xs font-medium text-luxury-gold">Paste a photo URL for this attraction:</p>
                                <input
                                  type="url"
                                  placeholder="https://upload.wikimedia.org/… or any image URL"
                                  value={photoEditing[a.id]}
                                  onChange={e => setPhotoEditing(prev => ({ ...prev, [a.id]: e.target.value }))}
                                  className="input-admin"
                                />
                                {photoEditing[a.id] && (
                                  <div className="relative h-28 w-full overflow-hidden rounded-lg border border-white/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={photoEditing[a.id]}
                                      alt="Preview"
                                      className="h-full w-full object-cover"
                                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveAttractionPhoto(a)}
                                    className="btn-luxury-primary !px-3 !py-1.5 text-xs"
                                  >
                                    Save Photo
                                  </button>
                                  <button
                                    onClick={() => setPhotoEditing(prev => { const n = { ...prev }; delete n[a.id]; return n })}
                                    className="px-4 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ))
                })()}
              </div>
            </motion.div>
          )}

          {activeTab === 'reservations' && (
            <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Event Reservations</h3>
                <button
                  onClick={() => loadReservations(selectedHotel)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-white/10 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {reservationsLoading && (
                <div className="text-center py-10 text-gray-400">Loading reservations...</div>
              )}

              {reservationsError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">{reservationsError}</div>
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
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-luxury-gold">{r.event_title}</p>
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
                            className="input-admin"
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

        <div className="admin-content-panel mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-luxury-gold">Preview guest experience</h3>
            <p className="mt-0.5 text-xs text-luxury-muted">Open the live concierge for {currentHotel.name}</p>
          </div>
          <a
            href={`/hotel/${selectedHotel}?preview=admin`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-luxury-outline inline-flex items-center justify-center gap-2 text-sm"
          >
            <Eye className="h-4 w-4" />
            Preview Hotel
          </a>
        </div>
    </AdminShell>
  )
}

function DashboardLoadingFallback() {
  return (
    <div className="luxury-page flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold" />
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <AdminDashboardPage />
    </Suspense>
  )
}