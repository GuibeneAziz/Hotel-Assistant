'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Star, Waves, Sun, Phone, ArrowRight, Settings } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

interface Hotel {
  id: string
  name: string
  location: string
  city: string
  description: string
  image: string
  rating: number
  features: string[]
  specialties: string[]
  accent: { from: string; to: string; glow: string; featureBg: string; specialtyBg: string }
}

const hotels: Hotel[] = [
  {
    id: 'sindbad-hammamet',
    name: 'Sindbad Hotel',
    location: 'Hammamet',
    city: 'Hammamet',
    description: 'Luxury beachfront resort with traditional Tunisian charm and modern amenities.',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop',
    rating: 4.5,
    features: ['feat_beachAccess', 'feat_spaWellness', 'feat_multipleRestaurants', 'feat_kidsClub'],
    specialties: ['spec_traditionalArch', 'spec_beachfrontLocation', 'spec_culturalActivities'],
    accent: { from: '#6366F1', to: '#06B6D4', glow: 'rgba(99,102,241,0.35)', featureBg: 'rgba(99,102,241,0.12)', specialtyBg: 'rgba(6,182,212,0.15)' },
  },
  {
    id: 'paradise-hammamet',
    name: 'Paradise Beach Hotel',
    location: 'Hammamet',
    city: 'Hammamet',
    description: 'Family-friendly paradise with pristine beaches and endless entertainment.',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop',
    rating: 4.7,
    features: ['feat_privateBeach', 'feat_waterSports', 'feat_familyActivities', 'feat_allInclusive'],
    specialties: ['spec_familyEntertainment', 'spec_waterActivities', 'spec_kidsPrograms'],
    accent: { from: '#10B981', to: '#34D399', glow: 'rgba(16,185,129,0.35)', featureBg: 'rgba(16,185,129,0.12)', specialtyBg: 'rgba(52,211,153,0.15)' },
  },
  {
    id: 'movenpick-sousse',
    name: 'Mövenpick Sousse',
    location: 'Sousse',
    city: 'Sousse',
    description: 'Premium resort in historic Sousse with cultural experiences and luxury amenities.',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
    rating: 4.8,
    features: ['feat_historicLocation', 'feat_luxurySpa', 'feat_fineDining', 'feat_culturalTours'],
    specialties: ['spec_historicMedina', 'spec_localExperiences', 'spec_premiumService'],
    accent: { from: '#F59E0B', to: '#F97316', glow: 'rgba(245,158,11,0.35)', featureBg: 'rgba(245,158,11,0.12)', specialtyBg: 'rgba(249,115,22,0.15)' },
  },
]

// Isolated clock — only this tiny component re-renders every second
function LiveClock() {
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis' })
  )
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis' }))
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return <p className="text-sm font-semibold text-amber-400 font-mono">{currentTime}</p>
}

// Isolated pulse dot — only this re-renders every 2 s
function PulseDot() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(id)
  }, [])
  return (
    <>
      <motion.div
        key={tick}
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 1.5 }}
        className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400"
      />
      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-gray-950" />
    </>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleHotelSelect = (hotel: Hotel) => {
    setIsLoading(true)
    setSelectedHotel(hotel)
    setTimeout(() => router.push(`/hotel/${hotel.id}`), 200)
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-x-hidden">

      {/* ── Animated background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 9 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 60%)' }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Header ── */}
      <header
        className="relative z-20 sticky top-0 border-b border-white/[0.07]"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
                >
                  <Sun className="w-5 h-5 text-white" />
                </motion.div>
                <PulseDot />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{t('appName')}</h1>
                <div className="flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs text-gray-500">{t('tagline')}</p>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center space-x-3">
              <LanguageSwitcher />
              <Link
                href="/admin/login"
                className="flex items-center space-x-2 px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
                <span>{t('adminBtn')}</span>
              </Link>
              <div
                className="px-4 py-2 rounded-xl border border-white/10 text-right"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <p className="text-[11px] text-gray-500 leading-none mb-1">{t('localTime')}</p>
                <LiveClock />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero section ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.h2
            className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {t('heroTitle')}{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #F59E0B, #FCD34D, #F59E0B)' }}
            >
              Tunisia
            </span>
          </motion.h2>

          <motion.p
            className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {t('heroSubtitle')}
          </motion.p>

          {/* Feature pills */}
          <motion.div
            className="flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {[
              { icon: Waves, textKey: 'featureBeach', color: '#06B6D4', bg: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.25)' },
              { icon: Sun, textKey: 'featureWeather', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
              { icon: Phone, textKey: 'featureAI', color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -2, scale: 1.04 }}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-full border text-sm font-medium"
                style={{ background: item.bg, borderColor: item.border, color: item.color }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.08 }}
              >
                <item.icon className="w-4 h-4" />
                <span>{t(item.textKey)}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Hotel cards ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <motion.h3
            className="text-2xl font-bold text-white mb-2 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {t('sectionTitle')}
          </motion.h3>
          <motion.p
            className="text-gray-500 text-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {t('sectionSubtitle')}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {hotels.map((hotel, index) => (
            <motion.div
              key={hotel.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.15, duration: 0.5, ease: 'easeOut' }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group cursor-pointer"
              onClick={() => handleHotelSelect(hotel)}
            >
              <div
                className="relative bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
                style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)' }}
              >
                {/* Top border glow */}
                <div
                  className="absolute inset-x-0 top-0 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                  style={{ background: `linear-gradient(90deg, transparent, ${hotel.accent.from}, transparent)` }}
                />

                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={hotel.image}
                    alt={hotel.name}
                    fill
                    sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
                  {/* Accent overlay on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                    style={{ background: `linear-gradient(135deg, ${hotel.accent.from}, ${hotel.accent.to})` }}
                  />

                  {/* Rating badge */}
                  <div
                    className="absolute top-3 right-3 flex items-center space-x-1 px-2.5 py-1 rounded-full border border-white/10"
                    style={{ background: 'rgba(9,9,11,0.75)', backdropFilter: 'blur(8px)' }}
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span className="text-xs font-semibold text-white">{hotel.rating}</span>
                  </div>

                  {/* Location badge */}
                  <div
                    className="absolute top-3 left-3 flex items-center space-x-1 px-2.5 py-1 rounded-full border border-white/10"
                    style={{ background: 'rgba(9,9,11,0.75)', backdropFilter: 'blur(8px)' }}
                  >
                    <MapPin className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-300 font-medium">{hotel.location}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Name with accent underline */}
                  <div className="mb-3">
                    <h4 className="text-lg font-bold text-white mb-0.5">{hotel.name}</h4>
                    <div
                      className="h-0.5 w-8 rounded-full transition-all duration-300 group-hover:w-16"
                      style={{ background: `linear-gradient(90deg, ${hotel.accent.from}, ${hotel.accent.to})` }}
                    />
                  </div>

                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{hotel.description}</p>

                  {/* Features */}
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('cardFeatures')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {hotel.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2.5 py-1 rounded-lg border border-white/5 text-gray-300 font-medium"
                          style={{ background: hotel.accent.featureBg }}
                        >
                          {t(feature)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="mb-5">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('cardSpecialties')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {hotel.specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2.5 py-1 rounded-lg border text-gray-200 font-medium"
                          style={{ background: hotel.accent.specialtyBg, borderColor: `${hotel.accent.from}30` }}
                        >
                          {t(specialty)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-5 rounded-xl text-sm font-semibold text-white transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${hotel.accent.from}, ${hotel.accent.to})`,
                      boxShadow: `0 0 0 1px rgba(255,255,255,0.08)`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 20px ${hotel.accent.glow}, 0 0 0 1px rgba(255,255,255,0.08)`)}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.08)`)}
                  >
                    <span>{t('cardCTA')}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Loading overlay ── */}
      <AnimatePresence>
        {isLoading && selectedHotel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl p-10 max-w-sm mx-4 text-center border border-white/10"
              style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px rgba(0,0,0,0.5)' }}
            >
              {/* Top border glow */}
              <div
                className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, transparent, ${selectedHotel.accent.from}, transparent)` }}
              />
              <motion.div
                className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${selectedHotel.accent.from}, ${selectedHotel.accent.to})`,
                  boxShadow: `0 0 40px ${selectedHotel.accent.glow}`,
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Sun className="w-10 h-10 text-white" />
              </motion.div>
              <p className="text-white font-semibold text-lg mb-1">{t('loadingTitle')}</p>
              <p className="text-gray-400 text-sm mb-6">
                {t('loadingSubtitle')}{' '}
                <span className="text-white font-medium">{selectedHotel.name}</span>
              </p>
              <div className="flex items-center justify-center space-x-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: selectedHotel.accent.from }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 border-t border-white/[0.07] py-8"
        style={{ background: 'rgba(9,9,11,0.6)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.p
            className="text-gray-600 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            {t('footerText')}
          </motion.p>
        </div>
      </footer>
    </div>
  )
}