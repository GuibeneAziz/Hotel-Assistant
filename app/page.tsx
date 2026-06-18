'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { MapPin, Star, ArrowRight, Settings } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'

// ── Data ──────────────────────────────────────────────────────────────────────

interface Hotel {
  id: string
  name: string
  location: string
  image: string
  rating: number
}

const hotels: Hotel[] = [
  {
    id: 'sindbad-hammamet',
    name: 'Sindbad Hotel',
    location: 'Hammamet, Tunisia',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&h=600&fit=crop',
    rating: 4.5,
  },
  {
    id: 'villa-didon-carthage',
    name: 'Villa Didon',
    location: 'Carthage, Tunisia',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&h=600&fit=crop',
    rating: 5.0,
  },
  {
    id: 'belvedere-fourati-tunis',
    name: 'Hôtel Belvédère Fourati',
    location: 'Tunis, Tunisia',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&h=600&fit=crop',
    rating: 4.3,
  },
]

// ── Hero background image ─────────────────────────────────────────────────────
const HERO_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=1080&fit=crop'

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, 180])
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3])

  const REDEFINING = [
    { icon: '✦', title: t('feature1Title'), body: t('feature1Body') },
    { icon: '✦', title: t('feature2Title'), body: t('feature2Body') },
    { icon: '✦', title: t('feature3Title'), body: t('feature3Body') },
  ]

  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setScrolled(v > 40))
    return unsub
  }, [scrollY])

  const handleHotelSelect = (hotel: Hotel) => {
    setIsLoading(true)
    setSelectedHotel(hotel)
    setTimeout(() => router.push(`/hotel/${hotel.id}`), 280)
  }

  return (
    <div className="lp-root">

      {/* ══════════════════════════════ HEADER ══════════════════════════════ */}
      <header className={`lp-header ${scrolled ? 'lp-header--scrolled' : ''}`}>
        <div className="lp-header-inner">
          {/* Logo */}
          <Link href="/" className="lp-logo">
            <span className="lp-logo-mark">S</span>
            <div>
              <p className="lp-logo-name">Spectrum H.A.</p>
              <p className="lp-logo-sub">Technique & Informatique — Hotel Assistant</p>
            </div>
          </Link>

          {/* Nav */}
          <nav className="lp-nav">
            <a href="#collection" className="lp-nav-link lp-nav-link--active">{t('navHotels')}</a>
            <a href="#redefining" className="lp-nav-link">{t('navFeatures')}</a>
          </nav>

          {/* Right actions */}
          <div className="lp-header-actions">
            <LanguageSwitcher />
            <Link href="/admin/login" className="btn-luxury-primary !min-h-0 !py-2 !px-5 text-sm">
              <Settings className="h-3.5 w-3.5" />
              {t('adminBtn')}
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════ HERO ══════════════════════════════ */}
      <section ref={heroRef} className="lp-hero">
        {/* Parallax background */}
        <motion.div className="lp-hero-bg" style={{ y: heroY, opacity: heroOpacity }}>
          <Image
            src={HERO_IMAGE}
            alt="Luxury resort"
            fill
            priority
            unoptimized
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Gradient overlays */}
          <div className="lp-hero-overlay-left" />
          <div className="lp-hero-overlay-bottom" />
        </motion.div>

        {/* Content */}
        <div className="lp-hero-content">
          <motion.div
            className="lp-hero-text"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Eyebrow pill */}
            <motion.div
              className="lp-hero-pill"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {t('heroEyebrow')}
            </motion.div>

            {/* Heading */}
            <motion.h1
              className="lp-hero-heading"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              {t('heroHeading1')}<br />
              <em className="lp-hero-heading-em">{t('heroHeading2')}</em>
            </motion.h1>

            {/* Sub */}
            <motion.p
              className="lp-hero-sub"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {t('heroSub')}
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="lp-hero-ctas"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <a href="#collection" className="btn-luxury-primary !py-3 !px-7 text-base">
                {t('heroCtaPrimary')}
              </a>
              <a href="#redefining" className="lp-cta-ghost">
                {t('heroCtaSecondary')}
              </a>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          className="lp-scroll-cue"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          <motion.div
            className="lp-scroll-dot"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          />
        </motion.div>
      </section>

      {/* ══════════════════════════════ COLLECTION ══════════════════════════════ */}
      <section id="collection" className="lp-section">
        <div className="lp-section-inner">
          <motion.div
            className="lp-section-header"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="lp-section-eyebrow">{t('collectionEyebrow')}</p>
            <h2 className="lp-section-title">{t('collectionTitle')}</h2>
          </motion.div>

          <div className="lp-cards-grid">
            {hotels.map((hotel, i) => (
              <motion.article
                key={hotel.id}
                className="lp-card"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.12, duration: 0.55, ease: 'easeOut' }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                onClick={() => handleHotelSelect(hotel)}
              >
                {/* Image */}
                <div className="lp-card-img-wrap">
                  <Image
                    src={hotel.image}
                    alt={hotel.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 767px) 100vw, 33vw"
                  />
                  <div className="lp-card-img-overlay" />
                  {/* Location */}
                  <div className="lp-card-location">
                    <MapPin className="h-3 w-3" />
                    {hotel.location}
                  </div>
                  {/* Rating */}
                  <div className="lp-card-rating">
                    <Star className="h-3 w-3 fill-current text-luxury-gold" />
                    <span>{hotel.rating}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="lp-card-body">
                  <p className="lp-card-tagline">{t(`hotel_${hotel.id}_tagline`)}</p>
                  <h3 className="lp-card-name">{hotel.name}</h3>
                  <p className="lp-card-desc">{t(`hotel_${hotel.id}_desc`)}</p>
                  <button className="lp-card-cta">
                    {t('cardCTA')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ REDEFINING SERVICE ══════════════════════════════ */}
      <section id="redefining" className="lp-section lp-section--dark">
        <div className="lp-section-inner">
          <motion.div
            className="lp-section-header"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="lp-section-eyebrow">{t('featuresEyebrow')}</p>
            <h2 className="lp-section-title">{t('featuresTitle')}</h2>
          </motion.div>

          <div className="lp-redefining-grid">
            {REDEFINING.map((item, i) => (
              <motion.div
                key={item.title}
                className="lp-redefining-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <span className="lp-redefining-icon">{item.icon}</span>
                <h4 className="lp-redefining-title">{item.title}</h4>
                <p className="lp-redefining-body">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════ FOOTER ══════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-logo-mark lp-logo-mark--sm">S</span>
            <div>
              <p className="font-serif text-sm font-semibold text-luxury-gold">Sindbad Luxury Hotels</p>
              <p className="text-xs text-luxury-muted">{t('footerBrandSub')}</p>
            </div>
          </div>
          <p className="lp-footer-copy">{t('footerText')}</p>
        </div>
      </footer>

      {/* ══════════════════════════════ LOADING OVERLAY ══════════════════════════════ */}
      <AnimatePresence>
        {isLoading && selectedHotel && (
          <motion.div
            className="lp-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="lp-loading-card"
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            >
              <motion.div
                className="lp-loading-icon"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Image src={selectedHotel.image} alt={selectedHotel.name} fill unoptimized className="object-cover" sizes="80px" />
              </motion.div>
              <p className="mt-5 font-serif text-lg font-semibold text-white">{t('loadingTitle')}</p>
              <p className="mt-1 text-sm text-luxury-muted">
                {t('loadingSubtitle')}{' '}
                <span className="font-medium text-white">{selectedHotel.name}</span>
              </p>
              <div className="mt-5 flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-luxury-gold"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
