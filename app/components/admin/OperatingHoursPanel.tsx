'use client'

import Image from 'next/image'
import {
  UtensilsCrossed,
  Flower2,
  Waves,
  Dumbbell,
  Baby,
  ConciergeBell,
  AlertTriangle,
  Pencil,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RestaurantSchedule {
  breakfast: { start: string; end: string; available: boolean }
  lunch:     { start: string; end: string; available: boolean }
  dinner:    { start: string; end: string; available: boolean }
}

export interface SpaSettings {
  available: boolean
  openTime: string
  closeTime: string
  treatments: string[]
  weekendOpenTime?: string
  weekendCloseTime?: string
  bookingRequired?: boolean
}

export interface PoolSettings {
  openTime: string
  closeTime: string
  available: boolean
  barOpenTime?: string
  barCloseTime?: string
  maintenanceNote?: string
  seasonLabel?: string
}

export interface GymSettings {
  openTime: string
  closeTime: string
  available: boolean
}

export interface KidsClubSettings {
  openTime: string
  closeTime: string
  available: boolean
  ageRange: string
}

export interface ReceptionSettings {
  openTime: string
  closeTime: string
}

export interface OperatingHoursHotelSlice {
  name: string
  restaurantDisplayName?: string
  restaurant: RestaurantSchedule
  spa: SpaSettings
  pool: PoolSettings
  gym: GymSettings
  kidsClub: KidsClubSettings
  reception?: ReceptionSettings
}

interface Props {
  hotel: OperatingHoursHotelSlice
  onUpdate: (updates: Partial<OperatingHoursHotelSlice>) => void
  onSave: () => void
  onReset: () => void
  saveStatus: 'idle' | 'saving' | 'saved'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function GoldToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`luxury-toggle${checked ? ' luxury-toggle-on' : ''}`}
    >
      <span className="luxury-toggle-knob" />
    </button>
  )
}

function TimeRange({
  openVal,
  closeVal,
  onChangeOpen,
  onChangeClose,
}: {
  openVal: string
  closeVal: string
  onChangeOpen: (v: string) => void
  onChangeClose: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="time" value={openVal}  onChange={(e) => onChangeOpen(e.target.value)}  className="oh-time-input w-[6.5rem]" />
      <span className="text-luxury-gold text-sm">–</span>
      <input type="time" value={closeVal} onChange={(e) => onChangeClose(e.target.value)} className="oh-time-input w-[6.5rem]" />
    </div>
  )
}

function ServiceRowToggle({
  label,
  available,
  onToggle,
  children,
}: {
  label: string
  available: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="oh-service-row">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold capitalize text-white">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${available ? 'text-emerald-400' : 'text-red-400'}`}>
            {available ? 'OPEN' : 'CLOSED'}
          </span>
          <GoldToggle checked={available} onChange={onToggle} />
        </div>
      </div>
      {available && children && (
        <div className="mt-3">{children}</div>
      )}
    </div>
  )
}

// ── Gallery ────────────────────────────────────────────────────────────────────

const GALLERY = [
  { label: 'Fine Dining',  src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=320&fit=crop' },
  { label: 'Wellness',     src: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=320&fit=crop' },
  { label: 'Poolside',     src: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=320&fit=crop' },
]

// ── Main component ─────────────────────────────────────────────────────────────

export default function OperatingHoursPanel({ hotel, onUpdate, onSave, onReset, saveStatus }: Props) {
  const { restaurant, spa, pool, gym, kidsClub } = hotel
  const reception = hotel.reception ?? { openTime: '08:00', closeTime: '23:00' }

  const weekendOpen  = spa.weekendOpenTime  ?? '08:00'
  const weekendClose = spa.weekendCloseTime ?? '22:00'
  const barOpen      = pool.barOpenTime  ?? pool.openTime
  const barClose     = pool.barCloseTime ?? pool.closeTime
  const mainNote     = pool.maintenanceNote ?? 'Maintenance scheduled for next Tuesday, 04:00 – 08:00.'

  return (
    <div className="oh-panel">

      {/* ── Header ── */}
      <div className="oh-panel-header">
        <div>
          <h2 className="oh-panel-title">Operating Hours</h2>
          <p className="oh-panel-subtitle">
            Configure availability for all services across all facilities. Changes are reflected instantly across guest apps and the AI concierge.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={onReset}
            className="btn-luxury-outline !min-h-0 !py-2 text-sm">
            Reset to Defaults
          </button>
          <button type="button" onClick={onSave} disabled={saveStatus === 'saving'}
            className="btn-luxury-primary !min-h-0 !py-2 text-sm disabled:opacity-50">
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── 2-col grid ── */}
      <div className="oh-grid">

        {/* ── Restaurant & Fine Dining ── */}
        <article className="oh-card">
          <header className="oh-card-header">
            <div className="oh-card-icon"><UtensilsCrossed className="h-5 w-5" /></div>
            <div>
              <p className="oh-card-eyebrow">Restaurant & Fine Dining</p>
              <h3 className="oh-card-title">{hotel.restaurantDisplayName ?? `${hotel.name} Restaurant`}</h3>
            </div>
          </header>
          <div className="oh-card-body space-y-1">
            {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
              const slot = restaurant[meal]
              return (
                <div key={meal} className="oh-meal-row">
                  <span className="oh-meal-name">{meal}</span>
                  <div className="flex flex-1 flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="oh-time-label">START TIME</span>
                      <input type="time" value={slot.start}
                        onChange={(e) => onUpdate({ restaurant: { ...restaurant, [meal]: { ...slot, start: e.target.value } } })}
                        className="oh-time-input" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="oh-time-label">END TIME</span>
                      <input type="time" value={slot.end}
                        onChange={(e) => onUpdate({ restaurant: { ...restaurant, [meal]: { ...slot, end: e.target.value } } })}
                        className="oh-time-input" />
                    </div>
                    <div className="flex items-center gap-1.5 pb-0.5">
                      <span className={`text-[10px] font-bold uppercase ${slot.available ? 'text-emerald-400' : 'text-red-400'}`}>
                        {slot.available ? 'OPEN' : 'CLOSED'}
                      </span>
                      <GoldToggle checked={slot.available}
                        onChange={(v) => onUpdate({ restaurant: { ...restaurant, [meal]: { ...slot, available: v } } })} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        {/* ── Spa & Wellness ── */}
        <article className="oh-card">
          <header className="oh-card-header">
            <div className="oh-card-icon"><Flower2 className="h-5 w-5" /></div>
            <div>
              <p className="oh-card-eyebrow">Spa & Wellness</p>
              <h3 className="oh-card-title">Spa & Hammam</h3>
            </div>
          </header>
          <div className="oh-card-body space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">Spa Open</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${spa.available ? 'text-emerald-400' : 'text-red-400'}`}>
                  {spa.available ? 'OPEN' : 'CLOSED'}
                </span>
                <GoldToggle checked={spa.available}
                  onChange={(v) => onUpdate({ spa: { ...spa, available: v } })} />
              </div>
            </div>
            <div className="oh-hours-line">
              <span className="text-luxury-muted text-sm">Daily Hours</span>
              <TimeRange openVal={spa.openTime} closeVal={spa.closeTime}
                onChangeOpen={(v)  => onUpdate({ spa: { ...spa, openTime: v } })}
                onChangeClose={(v) => onUpdate({ spa: { ...spa, closeTime: v } })} />
            </div>
            <div className="oh-hours-line">
              <span className="text-luxury-muted text-sm">Weekend</span>
              <TimeRange openVal={weekendOpen} closeVal={weekendClose}
                onChangeOpen={(v)  => onUpdate({ spa: { ...spa, weekendOpenTime: v } })}
                onChangeClose={(v) => onUpdate({ spa: { ...spa, weekendCloseTime: v } })} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 border-t border-white/10 pt-4">
              <input type="checkbox" checked={!!spa.bookingRequired}
                onChange={(e) => onUpdate({ spa: { ...spa, bookingRequired: e.target.checked } })}
                className="h-4 w-4 rounded border-white/20 bg-black/30 accent-luxury-gold" />
              <span className="text-sm text-gray-300">Booking Required</span>
            </label>
          </div>
        </article>

        {/* ── Pool & Terrace ── */}
        <article className="oh-card">
          <header className="oh-card-header">
            <div className="oh-card-icon"><Waves className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="oh-card-eyebrow">Pool & Terrace</p>
              <h3 className="oh-card-title">Pool & Terrace</h3>
            </div>
            <span className="oh-season-badge">{pool.seasonLabel ?? 'SUMMER SEASON'}</span>
          </header>
          <div className="oh-card-body space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">Pool Open</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${pool.available ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pool.available ? 'OPEN' : 'CLOSED'}
                </span>
                <GoldToggle checked={pool.available}
                  onChange={(v) => onUpdate({ pool: { ...pool, available: v } })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="oh-time-label mb-2">MAIN POOL</p>
                <TimeRange openVal={pool.openTime} closeVal={pool.closeTime}
                  onChangeOpen={(v)  => onUpdate({ pool: { ...pool, openTime: v } })}
                  onChangeClose={(v) => onUpdate({ pool: { ...pool, closeTime: v } })} />
              </div>
              <div>
                <p className="oh-time-label mb-2">INFINITY BAR</p>
                <TimeRange openVal={barOpen} closeVal={barClose}
                  onChangeOpen={(v)  => onUpdate({ pool: { ...pool, barOpenTime: v } })}
                  onChangeClose={(v) => onUpdate({ pool: { ...pool, barCloseTime: v } })} />
              </div>
            </div>
            <div className="flex gap-2 rounded-lg border border-luxury-gold/20 bg-luxury-gold/5 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-luxury-gold" />
              <input type="text" value={mainNote}
                onChange={(e) => onUpdate({ pool: { ...pool, maintenanceNote: e.target.value } })}
                className="min-w-0 flex-1 bg-transparent text-xs text-luxury-muted outline-none placeholder:text-gray-600"
                placeholder="Maintenance notice for guests…" />
            </div>
          </div>
        </article>

        {/* ── Gym & Fitness ── */}
        <article className="oh-card">
          <header className="oh-card-header">
            <div className="oh-card-icon"><Dumbbell className="h-5 w-5" /></div>
            <div>
              <p className="oh-card-eyebrow">Health & Fitness</p>
              <h3 className="oh-card-title">Gym & Fitness Centre</h3>
            </div>
          </header>
          <div className="oh-card-body space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">Gym Open</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${gym.available ? 'text-emerald-400' : 'text-red-400'}`}>
                  {gym.available ? 'OPEN' : 'CLOSED'}
                </span>
                <GoldToggle checked={gym.available}
                  onChange={(v) => onUpdate({ gym: { ...gym, available: v } })} />
              </div>
            </div>
            {gym.available && (
              <div className="oh-hours-line">
                <span className="text-luxury-muted text-sm">Opening Hours</span>
                <TimeRange openVal={gym.openTime} closeVal={gym.closeTime}
                  onChangeOpen={(v)  => onUpdate({ gym: { ...gym, openTime: v } })}
                  onChangeClose={(v) => onUpdate({ gym: { ...gym, closeTime: v } })} />
              </div>
            )}
          </div>
        </article>

        {/* ── Kids Club ── */}
        <article className="oh-card">
          <header className="oh-card-header">
            <div className="oh-card-icon"><Baby className="h-5 w-5" /></div>
            <div>
              <p className="oh-card-eyebrow">Family Services</p>
              <h3 className="oh-card-title">Kids Club</h3>
            </div>
          </header>
          <div className="oh-card-body space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">Kids Club Open</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${kidsClub.available ? 'text-emerald-400' : 'text-red-400'}`}>
                  {kidsClub.available ? 'OPEN' : 'CLOSED'}
                </span>
                <GoldToggle checked={kidsClub.available}
                  onChange={(v) => onUpdate({ kidsClub: { ...kidsClub, available: v } })} />
              </div>
            </div>
            {kidsClub.available && (
              <>
                <div className="oh-hours-line">
                  <span className="text-luxury-muted text-sm">Opening Hours</span>
                  <TimeRange openVal={kidsClub.openTime} closeVal={kidsClub.closeTime}
                    onChangeOpen={(v)  => onUpdate({ kidsClub: { ...kidsClub, openTime: v } })}
                    onChangeClose={(v) => onUpdate({ kidsClub: { ...kidsClub, closeTime: v } })} />
                </div>
                <div className="oh-hours-line">
                  <span className="text-luxury-muted text-sm">Age Range</span>
                  <input type="text" value={kidsClub.ageRange}
                    onChange={(e) => onUpdate({ kidsClub: { ...kidsClub, ageRange: e.target.value } })}
                    className="oh-time-input w-24 text-center"
                    placeholder="e.g. 4–12" />
                </div>
              </>
            )}
          </div>
        </article>

        {/* ── Concierge Desk ── */}
        <article className="oh-card">
          <header className="oh-card-header">
            <div className="oh-card-icon"><ConciergeBell className="h-5 w-5" /></div>
            <div>
              <p className="oh-card-eyebrow">Guest Services</p>
              <h3 className="oh-card-title">Concierge Desk</h3>
            </div>
          </header>
          <div className="oh-card-body space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">24/7 Digital Assistant</p>
                <p className="text-xs text-luxury-muted">AI concierge for all guest requests</p>
              </div>
              <span className="oh-active-badge">ALWAYS ACTIVE</span>
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="mb-2 text-sm font-medium text-white flex items-center gap-1.5">
                In-Person Attendant
                <Pencil className="h-3 w-3 text-luxury-gold/70" />
              </p>
              <TimeRange
                openVal={reception.openTime}
                closeVal={reception.closeTime}
                onChangeOpen={(v)  => onUpdate({ reception: { ...reception, openTime: v } })}
                onChangeClose={(v) => onUpdate({ reception: { ...reception, closeTime: v } })}
              />
            </div>
          </div>
        </article>

      </div>

      {/* ── Gallery ── */}
      <div className="oh-gallery">
        {GALLERY.map((item) => (
          <div key={item.label} className="oh-gallery-item">
            <Image src={item.src} alt={item.label} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
            <div className="oh-gallery-overlay"><span>{item.label}</span></div>
          </div>
        ))}
      </div>

    </div>
  )
}
