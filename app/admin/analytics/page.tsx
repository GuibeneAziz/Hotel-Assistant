'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import {
  Users, MessageSquare, TrendingUp, Globe,
  RefreshCw, Activity, PieChart as PieChartIcon,
  Sparkles, Zap, ThumbsUp,
  Languages, Clock, Hash, Building2,
} from 'lucide-react'
import AdminShell from '@/app/components/admin/AdminShell'
import { getAdminToken } from '@/lib/admin-auth'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CHART_PALETTE = [
  '#D4AF37', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6',
  '#3B82F6', '#F97316', '#06B6D4', '#EF4444', '#84CC16', '#A855F7',
]

function chartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length]
}

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ target }: { target: number | string }) {
  const [displayed, setDisplayed] = useState(0)
  const isNum = typeof target === 'number'
  useEffect(() => {
    if (!isNum) return
    let start = 0
    const dur = 1200
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setDisplayed(Math.floor(e * (target as number)))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, isNum])
  return <>{isNum ? displayed.toLocaleString() : target}</>
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      {label && <p className="mb-1 text-xs font-medium text-gray-400">{label}</p>}
      {payload.map((e: any, i: number) => (
        <p key={i} className="text-sm font-bold" style={{ color: e.color ?? '#fff' }}>
          {e.name}: <span className="text-white">{e.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ name, value, max, color, delay, suffix = '' }: {
  name: string; value: number; max: number; color: string; delay: number; suffix?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="mb-3"
    >
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-gray-300 capitalize">{name}</span>
        <span className="font-mono text-gray-400">{value.toLocaleString()}{suffix}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
          transition={{ delay: delay + 0.1, duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  )
}

const CHART_HEIGHT = 260

// ─── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({ children, delay = 0, className = '', title, icon: Icon, color = '#D4AF37' }: {
  children: React.ReactNode; delay?: number; className?: string
  title?: string; icon?: any; color?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`luxury-card relative flex h-full flex-col overflow-hidden ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="flex flex-1 flex-col p-6">
        {title && (
          <div className="mb-5 flex items-center gap-3">
            {Icon && (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
            )}
            <h3 className="text-base font-semibold text-white">{title}</h3>
          </div>
        )}
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </motion.div>
  )
}

// ─── Insight badge ────────────────────────────────────────────────────────────
function InsightBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="font-semibold text-sm" style={{ color }}>{value}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const router = useRouter()
  const [selectedHotel, setSelectedHotel] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('7d')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!getAdminToken()) router.push('/admin/login')
  }, [router])

  const buildUrl = useCallback((ep: string) => {
    const p = new URLSearchParams()
    if (selectedHotel !== 'all') p.set('hotelId', selectedHotel)
    p.set('timeRange', timeRange)
    return `/api/analytics/${ep}?${p}`
  }, [selectedHotel, timeRange])

  const { data: overviewData, error: overviewError, mutate: mutateOverview } =
    useSWR(buildUrl('overview'), fetcher, { refreshInterval: 30_000 })
  const { data: demographicsData, mutate: mutateDemographics } =
    useSWR(buildUrl('demographics'), fetcher, { refreshInterval: 60_000 })
  const { data: questionsData, mutate: mutateQuestions } =
    useSWR(buildUrl('questions'), fetcher, { refreshInterval: 30_000 })
  const { data: reactionData, mutate: mutateReaction } =
    useSWR(buildUrl('reaction'), fetcher, { refreshInterval: 30_000 })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([mutateOverview(), mutateDemographics(), mutateQuestions(), mutateReaction()])
    setIsRefreshing(false)
  }

  if (!overviewData && !overviewError) {
    return (
      <div className="luxury-page flex min-h-screen items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-luxury-gold shadow-lg shadow-luxury-gold/30"
          >
            <Activity className="h-12 w-12 text-luxury-bg" />
          </motion.div>
          <p className="text-white font-semibold text-lg mb-1">Loading Analytics</p>
          <p className="text-gray-500 text-sm">Fetching real-time insights…</p>
          <div className="mt-5 flex justify-center gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="h-2 w-2 rounded-full bg-luxury-gold"
                animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const ov = overviewData?.data ?? {}
  const dm = demographicsData?.data ?? {}
  const qu = questionsData?.data ?? {}
  const rx = reactionData?.data ?? {}

  const natMax = dm.topNationalities?.reduce((m: number, n: any) => Math.max(m, n.value), 1) ?? 1

  // Peak hours: find the busiest 3-hour window
  const peakWindow = (() => {
    const h = qu.peakHours ?? []
    if (!h.length) return null
    let best = 0, bestIdx = 0
    for (let i = 0; i < h.length - 2; i++) {
      const sum = (h[i]?.interactions ?? 0) + (h[i+1]?.interactions ?? 0) + (h[i+2]?.interactions ?? 0)
      if (sum > best) { best = sum; bestIdx = i }
    }
    return best > 0 ? `${h[bestIdx]?.hour} – ${h[bestIdx + 2]?.hour}` : null
  })()

  const satisfactionScore = rx.score !== null && rx.score !== undefined ? `${rx.score}%` : '—'

  const refreshAction = (
    <motion.button
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="btn-luxury-primary flex items-center gap-2 !min-h-0 !py-2 disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      Refresh
    </motion.button>
  )

  return (
    <AdminShell
      pageTitle="Analytics"
      pageDescription="Live guest demographics, AI interaction metrics, and question trends across your hotels."
      headerActions={refreshAction}
    >

      {/* ── Filters ── */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
          {[{ value: '1d', label: '24h' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }].map(r => (
            <button key={r.value} onClick={() => setTimeRange(r.value)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                timeRange === r.value ? 'admin-tab-pill-active' : 'text-luxury-muted hover:text-white'
              }`}
            >{r.label}</button>
          ))}
        </div>
        <select value={selectedHotel} onChange={e => setSelectedHotel(e.target.value)}
          className="input-admin !w-auto min-w-[170px] py-2">
          <option value="all" className="bg-gray-900">All Hotels</option>
          <option value="sindbad-hammamet" className="bg-gray-900">Sindbad Hotel</option>
          <option value="villa-didon-carthage" className="bg-gray-900">Villa Didon</option>
          <option value="belvedere-fourati-tunis" className="bg-gray-900">Belvédère Fourati</option>
        </select>
        <div className="flex items-center gap-1.5 text-xs text-luxury-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-luxury-gold" />
          Live data
        </div>
      </div>

      <div className="space-y-6">

        {/* ── KPI Cards ── */}
        {overviewData?.success && (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[
              { label: 'Total Guests', value: ov.totalGuests, icon: Users,
                style: { from: '#D4AF37', to: '#E8C547', glow: 'rgba(212,175,55,.35)' } },
              { label: 'Total Interactions', value: ov.totalInteractions, icon: MessageSquare,
                style: { from: '#10B981', to: '#34D399', glow: 'rgba(16,185,129,.35)' } },
              { label: 'Avg. Per Session', value: ov.avgInteractions, icon: TrendingUp,
                style: { from: '#B8962E', to: '#D4AF37', glow: 'rgba(184,150,46,.35)' } },
              { label: 'Top Topic', value: ov.topCategory, icon: Zap,
                style: { from: '#F59E0B', to: '#FCD34D', glow: 'rgba(245,158,11,.35)' } },
              { label: 'Satisfaction', value: satisfactionScore, icon: ThumbsUp,
                style: { from: '#8B5CF6', to: '#A78BFA', glow: 'rgba(139,92,246,.35)' } },
            ].map((stat, i) => (
              <motion.div key={stat.label}
                initial={{ opacity: 0, y: 28, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.05 * i, duration: 0.45, ease: 'easeOut' }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="relative rounded-2xl p-5 overflow-hidden cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: `0 0 40px ${stat.style.glow}, 0 4px 24px rgba(0,0,0,.3)`,
                }}
              >
                <div className="absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(90deg,transparent,${stat.style.from},transparent)` }} />
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-20"
                  style={{ background: `radial-gradient(circle,${stat.style.from},transparent)` }} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-white capitalize tabular-nums">
                      <AnimatedNumber target={stat.value ?? 0} />
                    </p>
                  </div>
                  <motion.div whileHover={{ rotate: 10, scale: 1.1 }}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: `linear-gradient(135deg,${stat.style.from},${stat.style.to})`, boxShadow: `0 0 20px ${stat.style.glow}` }}
                  >
                    <stat.icon className="h-5 w-5 text-white" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Hotel comparison (when "All Hotels" is selected) ── */}
        {selectedHotel === 'all' && overviewData?.success && ov.hotelComparison?.length > 0 && (
          <ChartCard title="Hotel Comparison" icon={Building2} color="#D4AF37" delay={0.1}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-6">Hotel</th>
                    <th className="pb-3 pr-6 text-right">Guests</th>
                    <th className="pb-3 pr-6 text-right">Interactions</th>
                    <th className="pb-3 text-right">Avg / Session</th>
                  </tr>
                </thead>
                <tbody>
                  {ov.hotelComparison.map((h: any, i: number) => (
                    <motion.tr key={h.hotelId}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="py-3 pr-6 font-medium text-white">{h.name}</td>
                      <td className="py-3 pr-6 text-right font-mono text-luxury-gold">{h.guests.toLocaleString()}</td>
                      <td className="py-3 pr-6 text-right font-mono text-gray-300">{h.interactions.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-gray-300">{h.avgInteractions}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}

        {/* ── Row 1: Age + Language ── */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">

          {demographicsData?.success && (
            <ChartCard title="Age Distribution" icon={PieChartIcon} color="#D4AF37" delay={0.15}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={dm.ageDistribution} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={95} paddingAngle={4} cornerRadius={5}
                    dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ strokeWidth: 1, stroke: '#4B5563' }}
                    isAnimationActive animationBegin={200} animationDuration={800}
                  >
                    {dm.ageDistribution?.map((_: any, i: number) => (
                      <Cell key={i} fill={chartColor(i)} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {demographicsData?.success && (
            <ChartCard title="Language Distribution" icon={Languages} color="#10B981" delay={0.2}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={dm.languageDistribution ?? []} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={95} paddingAngle={4} cornerRadius={5}
                    dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ strokeWidth: 1, stroke: '#4B5563' }}
                    isAnimationActive animationBegin={250} animationDuration={800}
                  >
                    {(dm.languageDistribution ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={chartColor(i)} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {!dm.languageDistribution?.length && (
                <p className="text-center text-sm text-gray-500 -mt-4">
                  Language data collected on each guest chat message
                </p>
              )}
            </ChartCard>
          )}
        </div>

        {/* ── Row 2: Top Nationalities + Travel Purposes ── */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">

          {demographicsData?.success && (
            <ChartCard title="Top Nationalities" icon={Globe} color="#E8C547" delay={0.2}>
              <div className="mt-1">
                {dm.topNationalities?.slice(0, 8).map((nat: any, i: number) => (
                  <ProgressBar key={nat.name} name={nat.name} value={nat.value} max={natMax}
                    color={chartColor(i)} delay={0.25 + i * 0.05} />
                ))}
                {!dm.topNationalities?.length && (
                  <p className="text-sm text-gray-500 text-center py-8">No data yet</p>
                )}
              </div>
            </ChartCard>
          )}

          {demographicsData?.success && (
            <ChartCard title="Travel Purposes" icon={Sparkles} color="#F59E0B" delay={0.25}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={dm.travelPurposes ?? []} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={95} paddingAngle={4} cornerRadius={5}
                    dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ strokeWidth: 1, stroke: '#4B5563' }}
                    isAnimationActive animationBegin={300} animationDuration={800}
                  >
                    {(dm.travelPurposes ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={chartColor(i)} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

        {/* ── Row 3: Questions Over Time + Most Discussed Topics ── */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">

          {questionsData?.success && (
            <ChartCard title="Questions Over Time" icon={Activity} color="#8B5CF6" delay={0.25}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={qu.questionsOverTime ?? []} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(139,92,246,.3)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="questions" stroke="#8B5CF6" strokeWidth={2.5}
                    fill="url(#areaGrad)"
                    dot={{ r: 3.5, fill: '#8B5CF6', stroke: '#1a1a2e', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {questionsData?.success && (
            <ChartCard title="Most Discussed Topics" icon={Hash} color="#F59E0B" delay={0.3}>
              {(qu.popularTopics ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={qu.popularTopics ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                    <Bar dataKey="value" name="Questions" radius={[0, 5, 5, 0]} barSize={18}
                      isAnimationActive animationDuration={800}>
                    {(qu.popularTopics ?? []).map((topic: any, i: number) => (
                      <Cell key={topic.key ?? i} fill={chartColor(i)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-12">
                  Topics are classified from guest chat messages (activities, dining, facilities, etc.)
                </p>
              )}
            </ChartCard>
          )}
        </div>

        {/* ── Row 4: Peak Hours + Group Types ── */}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">

          {questionsData?.success && (
            <ChartCard title="Peak Activity Hours" icon={Clock} color="#D4AF37" delay={0.32}>
              <div className="mb-3 flex min-h-7 items-center justify-between text-xs text-gray-500">
                <span>Guest activity by hour of day (server time)</span>
                {peakWindow && (
                  <span className="rounded-full border border-luxury-gold/25 bg-luxury-gold/10 px-2.5 py-1 font-medium text-luxury-gold">
                    Peak: {peakWindow}
                  </span>
                )}
              </div>
              <div className="min-h-[260px] flex-1">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={qu.peakHours ?? []} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="peakBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity={1} />
                      <stop offset="100%" stopColor="#B8962E" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#6B7280' }}
                    axisLine={false} tickLine={false}
                    interval={2} tickFormatter={h => h.slice(0, 2)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                  <Bar dataKey="interactions" name="Active guests" fill="url(#peakBarGrad)"
                    radius={[3, 3, 0, 0]} barSize={10}
                    isAnimationActive animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
              </div>
              {!qu.peakHours?.some((h: any) => h.interactions > 0) && (
                <p className="-mt-4 text-center text-sm text-gray-500">
                  Real data collected from guest session timestamps
                </p>
              )}
            </ChartCard>
          )}

          {demographicsData?.success && (
            <ChartCard title="Group Types" icon={Users} color="#EC4899" delay={0.38}>
              <div className="mb-3 flex min-h-7 items-center text-xs text-gray-500">
                <span>Guests by travel party composition</span>
              </div>
              <div className="min-h-[260px] flex-1">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={dm.groupTypes ?? []} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={42}
                    isAnimationActive animationDuration={800}>
                    {(dm.groupTypes ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={chartColor(i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ChartCard>
          )}
        </div>

        {/* ── Satisfaction row ── */}
        <ChartCard title="Guest Satisfaction — AI Concierge Ratings" icon={ThumbsUp} color="#8B5CF6" delay={0.42}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InsightBadge label="Positive ratings" value={rx.positive ?? 0} color="#10B981" />
            <InsightBadge label="Negative ratings" value={rx.negative ?? 0} color="#EF4444" />
            <InsightBadge label="Total rated" value={rx.total ?? 0} color="#D4AF37" />
            <InsightBadge label="Satisfaction score" value={satisfactionScore} color="#8B5CF6" />
          </div>
          {rx.total > 0 && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Positive</span>
                <span>{satisfactionScore}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${rx.score ?? 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                />
              </div>
            </div>
          )}
          {!rx.total && (
            <p className="mt-3 text-sm text-gray-500">
              Guests can rate AI responses with 👍 / 👎 in the chat interface.
            </p>
          )}
        </ChartCard>

        <div className="h-8" />
      </div>
    </AdminShell>
  )
}
