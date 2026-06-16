'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bed, Globe, Briefcase, Users, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

interface GuestRegistrationFormProps {
  hotelId: string
  hotelName: string
  onComplete: (sessionId: string, profile: GuestProfile) => void
}

export interface GuestProfile {
  ageRange: '18-25' | '26-35' | '36-50' | '50+'
  nationality: string
  travelPurpose: 'leisure' | 'business' | 'family' | 'honeymoon'
  groupType: 'solo' | 'couple' | 'family' | 'group'
}

export default function GuestRegistrationForm({ hotelId, hotelName, onComplete }: GuestRegistrationFormProps) {
  const { t } = useLanguage()
  const [profile, setProfile] = useState<GuestProfile>({
    ageRange: '26-35',
    nationality: '',
    travelPurpose: 'leisure',
    groupType: 'couple',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      try {
        await fetch('/api/analytics/guest-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            hotelId,
            ...profile,
          }),
        })
      } catch (apiError) {
        console.log('Analytics API unavailable, continuing anyway:', apiError)
      }

      onComplete(sessionId, profile)
    } catch (error) {
      console.error('Error in registration:', error)
      alert('Failed to save your information. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="luxury-page relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1920&q=80)',
        }}
      />
      <div className="absolute inset-0 bg-luxury-bg/85 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md luxury-glass rounded-2xl p-8 shadow-luxury"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-luxury-gold/40 bg-luxury-gold/10">
            <Bed className="h-7 w-7 text-luxury-gold" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-white mb-2">
            {t('formTitle')} {hotelName}
          </h2>
          <p className="text-sm text-luxury-muted">{t('formSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="luxury-label flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              {t('ageRange')}
            </label>
            <select
              value={profile.ageRange}
              onChange={(e) => setProfile({ ...profile, ageRange: e.target.value as GuestProfile['ageRange'] })}
              className="luxury-input [&>option]:bg-luxury-card [&>option]:text-white"
              required
            >
              <option value="18-25">{t('age1825')}</option>
              <option value="26-35">{t('age2635')}</option>
              <option value="36-50">{t('age3650')}</option>
              <option value="50+">{t('age50plus')}</option>
            </select>
          </div>

          <div>
            <label className="luxury-label flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              {t('nationality')}
            </label>
            <select
              value={profile.nationality}
              onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
              className="luxury-input [&>option]:bg-luxury-card [&>option]:text-white"
              required
            >
              <option value="" disabled>{t('nationalityPlaceholder')}</option>
              <option value="Tunisian">🇹🇳 Tunisian</option>
              <option value="French">🇫🇷 French</option>
              <option value="German">🇩🇪 German</option>
              <option value="Italian">🇮🇹 Italian</option>
              <option value="Spanish">🇪🇸 Spanish</option>
              <option value="British">🇬🇧 British</option>
              <option value="American">🇺🇸 American</option>
              <option value="Algerian">🇩🇿 Algerian</option>
              <option value="Moroccan">🇲🇦 Moroccan</option>
              <option value="Libyan">🇱🇾 Libyan</option>
              <option value="Egyptian">🇪🇬 Egyptian</option>
              <option value="Dutch">🇳🇱 Dutch</option>
              <option value="Belgian">🇧🇪 Belgian</option>
              <option value="Swiss">🇨🇭 Swiss</option>
              <option value="Polish">🇵🇱 Polish</option>
              <option value="Russian">🇷🇺 Russian</option>
              <option value="Other">🌍 Other</option>
            </select>
          </div>

          <div>
            <label className="luxury-label flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5" />
              {t('travelPurpose')}
            </label>
            <select
              value={profile.travelPurpose}
              onChange={(e) => setProfile({ ...profile, travelPurpose: e.target.value as GuestProfile['travelPurpose'] })}
              className="luxury-input [&>option]:bg-luxury-card [&>option]:text-white"
              required
            >
              <option value="leisure">{t('purposeLeisure')}</option>
              <option value="business">{t('purposeBusiness')}</option>
              <option value="family">{t('purposeFamily')}</option>
              <option value="honeymoon">{t('purposeHoneymoon')}</option>
            </select>
          </div>

          <div>
            <label className="luxury-label flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              {t('travelingWith')}
            </label>
            <select
              value={profile.groupType}
              onChange={(e) => setProfile({ ...profile, groupType: e.target.value as GuestProfile['groupType'] })}
              className="luxury-input [&>option]:bg-luxury-card [&>option]:text-white"
              required
            >
              <option value="solo">{t('groupSolo')}</option>
              <option value="couple">{t('groupCouple')}</option>
              <option value="family">{t('groupFamily')}</option>
              <option value="group">{t('groupGroup')}</option>
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="btn-luxury-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3.5 disabled:opacity-50"
          >
            {isSubmitting ? t('saving') : t('continueBtn')}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </motion.button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-500">{t('formFooter')}</p>
      </motion.div>

      <p className="absolute bottom-4 left-6 z-10 text-xs text-neutral-500">
        © 2025 Sindbad Luxury Hotels
      </p>
    </div>
  )
}
