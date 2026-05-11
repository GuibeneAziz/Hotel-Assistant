'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Globe, Briefcase, Users } from 'lucide-react'
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
    groupType: 'couple'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Try to save profile to database (optional - don't block if it fails)
      try {
        await fetch('/api/analytics/guest-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            hotelId,
            ...profile
          })
        })
      } catch (apiError) {
        console.log('Analytics API unavailable, continuing anyway:', apiError)
      }

      // Always complete the registration (don't block on API)
      onComplete(sessionId, profile)
    } catch (error) {
      console.error('Error in registration:', error)
      alert('Failed to save your information. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gray-900/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 max-w-md w-full z-10 overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)' }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 30px rgba(99,102,241,0.35)' }}
          >
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{t('formTitle')} {hotelName}</h2>
          <p className="text-gray-500 text-sm">
            {t('formSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Age Range */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              <User className="w-4 h-4 inline mr-2" />
              {t('ageRange')}
            </label>
            <select
              value={profile.ageRange}
              onChange={(e) => setProfile({ ...profile, ageRange: e.target.value as any })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none [&>option]:bg-gray-900 [&>option]:text-white transition-all"
              required
            >
              <option value="18-25">{t('age1825')}</option>
              <option value="26-35">{t('age2635')}</option>
              <option value="36-50">{t('age3650')}</option>
              <option value="50+">{t('age50plus')}</option>
            </select>
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              <Globe className="w-4 h-4 inline mr-2" />
              {t('nationality')}
            </label>
            <input
              type="text"
              value={profile.nationality}
              onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
              placeholder={t('nationalityPlaceholder')}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none placeholder:text-gray-600 transition-all"
              required
            />
          </div>

          {/* Travel Purpose */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              <Briefcase className="w-4 h-4 inline mr-2" />
              {t('travelPurpose')}
            </label>
            <select
              value={profile.travelPurpose}
              onChange={(e) => setProfile({ ...profile, travelPurpose: e.target.value as any })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none [&>option]:bg-gray-900 [&>option]:text-white transition-all"
              required
            >
              <option value="leisure">{t('purposeLeisure')}</option>
              <option value="business">{t('purposeBusiness')}</option>
              <option value="family">{t('purposeFamily')}</option>
              <option value="honeymoon">{t('purposeHoneymoon')}</option>
            </select>
          </div>

          {/* Group Type */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              <Users className="w-4 h-4 inline mr-2" />
              {t('travelingWith')}
            </label>
            <select
              value={profile.groupType}
              onChange={(e) => setProfile({ ...profile, groupType: e.target.value as any })}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none [&>option]:bg-gray-900 [&>option]:text-white transition-all"
              required
            >
              <option value="solo">{t('groupSolo')}</option>
              <option value="couple">{t('groupCouple')}</option>
              <option value="family">{t('groupFamily')}</option>
              <option value="group">{t('groupGroup')}</option>
            </select>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
          >
            {isSubmitting ? t('saving') : t('continueBtn')}
          </motion.button>
        </form>

        <p className="text-xs text-gray-600 text-center mt-4">
          {t('formFooter')}
        </p>
      </motion.div>
    </div>
  )
}
