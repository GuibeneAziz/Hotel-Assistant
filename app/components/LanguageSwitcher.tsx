'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe } from 'lucide-react'
import { useLanguage, LANGUAGES, type Language } from '@/lib/i18n'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0]

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (code: Language) => {
    setLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center space-x-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium text-gray-300"
      >
        <Globe className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-3.5 h-3.5 text-gray-500 shrink-0"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 overflow-hidden z-50"
            style={{ background: 'rgba(9,9,11,0.95)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            {LANGUAGES.map((lang) => (
              <motion.button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors ${
                  lang.code === language
                    ? 'text-white bg-white/[0.07]'
                    : 'text-gray-400'
                }`}
              >
                <span className="text-base w-5 text-center">{lang.flag}</span>
                <span className="font-medium">{lang.label}</span>
                {lang.code === language && (
                  <svg className="w-3.5 h-3.5 text-indigo-400 ml-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
