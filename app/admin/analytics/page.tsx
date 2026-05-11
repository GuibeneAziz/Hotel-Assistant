'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts'
import {
  Users, MessageSquare, TrendingUp, Globe,
  ArrowLeft, RefreshCw, Activity, PieChart as PieChartIcon,
  BarChart3, Sparkles, Zap,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

const COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#84CC16', '#F97316']
const PIE_COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6']

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ target }: { target: number | string }) {
  const [displayed, setDisplayed] = useState(0)
  const isNum = typeof target === 'number'
  useEffect(() => {
    if (!isNum) return
    let start = 0
    const duration = 1200
    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.floor(ease * (target as number)))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, isNum])
  return <>{isNum ? displayed.toLocaleString() : target}</>
}

// ─── Glow tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl px-4 py-3 shadow-2xl border border-white/10">
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-bold" style={{ color: entry.color ?? '#fff' }}>
          {entry.name}: <span className="text-white">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Animated progress bar (for nationalities) ────────────────────────────────
function ProgressBar({ name, value, max, color, delay }: { name: string; value: number; max: number; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="mb-3"
    >
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-gray-300">{name}</span>
        <span className="text-gray-400 font-mono">{value}</span>
      </div>
      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }}
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          transition={{ delay: delay + 0.1, duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  )
}

// ─── Stat card styles ─────────────────────────────────────────────────────────
const STAT_STYLES = [
  { from: '#6366F1', to: '#818CF8', glow: 'rgba(99,102,241,0.35)', label: 'indigo' },
  { from: '#10B981', to: '#34D399', glow: 'rgba(16,185,129,0.35)', label: 'emerald' },
  { from: '#8B5CF6', to: '#A78BFA', glow: 'rgba(139,92,246,0.35)', label: 'violet' },
  { from: '#F59E0B', to: '#FCD34D', glow: 'rgba(245,158,11,0.35)', label: 'amber' },
]

// ─── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`relative bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden group ${className}`}
      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)' }}
    >
      {/* Subtle top border glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="p-6">{children}</div>
    </motion.div>
  )
}

// ─── Chart section header ─────────────────────────────────────────────────────
function ChartHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <div className="flex items-center space-x-3 mb-6">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
    </div>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [selectedHotel, setSelectedHotel] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('7d')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [tick, setTick] = useState(0)

  // Live pulse clock
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) router.push('/admin/login')
  }, [router])

  const buildUrl = (endpoint: string) => {
    const params = new URLSearchParams()
    if (selectedHotel !== 'all') params.set('hotelId', selectedHotel)
    params.set('timeRange', timeRange)
    return `/api/analytics/${endpoint}?${params.toString()}`
  }

  const { data: overviewData, error: overviewError, mutate: mutateOverview } = useSWR(buildUrl('overview'), fetcher, { refreshInterval: 30000 })
  const { data: demographicsData, mutate: mutateDemographics } = useSWR(buildUrl('demographics'), fetcher, { refreshInterval: 60000 })
  const { data: questionsData, mutate: mutateQuestions } = useSWR(buildUrl('questions'), fetcher, { refreshInterval: 30000 })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([mutateOverview(), mutateDemographics(), mutateQuestions()])
    setIsRefreshing(false)
  }

  // ── Loading screen ──
  if (!overviewData && !overviewError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 60px rgba(99,102,241,0.4)' }}
          >
            <Activity className="w-12 h-12 text-white" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-white font-semibold text-lg mb-1">Loading Analytics</p>
            <p className="text-gray-500 text-sm">Fetching real-time data…</p>
          </motion.div>
          <div className="flex items-center justify-center space-x-1.5 mt-6">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-500"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const natMax = demographicsData?.data?.topNationalities?.reduce((m: number, n: any) => Math.max(m, n.value), 1) ?? 1

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-x-hidden">

      {/* ── Animated background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
          transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 8 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 60%)' }}
        />
        {/* Grid lines overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />
      </div>

      {/* ── Header ── */}
      <header className="relative z-20 border-b border-white/[0.07]" style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => router.push('/dashboard')}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1, #06B6D4)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  {/* Live pulse */}
                  <motion.div
                    key={tick}
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400"
                  />
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-gray-950" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Analytics</h1>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-xs text-gray-500">Live data</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center space-x-2">
              {/* Time range */}
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                {[{ value: '1d', label: '24h' }, { value: '7d', label: '7d' }, { value: '30d', label: '30d' }].map(r => (
                  <motion.button
                    key={r.value}
                    onClick={() => setTimeRange(r.value)}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      timeRange === r.value
                        ? 'text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                    style={timeRange === r.value ? { background: 'linear-gradient(135deg, #6366F1, #818CF8)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' } : {}}
                  >
                    {r.label}
                  </motion.button>
                ))}
              </div>

              {/* Hotel selector */}
              <select
                value={selectedHotel}
                onChange={e => setSelectedHotel(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-medium text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
              >
                <option value="all" className="bg-gray-900">All Hotels</option>
                <option value="sindbad-hammamet" className="bg-gray-900">Sindbad Hotel</option>
                <option value="paradise-hammamet" className="bg-gray-900">Paradise Beach</option>
                <option value="movenpick-sousse" className="bg-gray-900">Mövenpick Sousse</option>
              </select>

              {/* Refresh */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)', boxShadow: isRefreshing ? 'none' : '0 0 20px rgba(99,102,241,0.35)' }}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">

        {/* ── KPI Cards ── */}
        {overviewData?.success && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[
              { label: 'Total Guests', value: overviewData.data.totalGuests, icon: Users, style: STAT_STYLES[0] },
              { label: 'Total Interactions', value: overviewData.data.totalInteractions, icon: MessageSquare, style: STAT_STYLES[1] },
              { label: 'Avg. Interactions', value: overviewData.data.avgInteractions, icon: TrendingUp, style: STAT_STYLES[2] },
              { label: 'Top Category', value: overviewData.data.topCategory, icon: Zap, style: STAT_STYLES[3] },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.05 * i, duration: 0.45, ease: 'easeOut' }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="relative rounded-2xl p-5 overflow-hidden cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: `0 0 40px ${stat.style.glow}, 0 4px 24px rgba(0,0,0,0.3)`,
                }}
              >
                {/* Gradient top bar */}
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${stat.style.from}, transparent)` }} />
                {/* Background glow */}
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${stat.style.from}, transparent)` }} />

                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-2 capitalize tabular-nums">
                      <AnimatedNumber target={stat.value} />
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${stat.style.from}, ${stat.style.to})`, boxShadow: `0 0 20px ${stat.style.glow}` }}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Charts row 1 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Age Distribution */}
          {demographicsData?.success && (
            <ChartCard delay={0.15}>
              <ChartHeader icon={PieChartIcon} title="Age Distribution" color="#6366F1" />
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <defs>
                    {PIE_COLORS.map((c, i) => (
                      <radialGradient key={i} id={`pieGrad${i}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={c} stopOpacity={1} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.7} />
                      </radialGradient>
                    ))}
                  </defs>
                  <Pie
                    data={demographicsData.data.ageDistribution}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={4} cornerRadius={6}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ strokeWidth: 1, stroke: '#4B5563' }}
                    isAnimationActive animationBegin={200} animationDuration={800}
                  >
                    {demographicsData.data.ageDistribution.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={`url(#pieGrad${index % PIE_COLORS.length})`} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Top Nationalities — animated progress bars */}
          {demographicsData?.success && (
            <ChartCard delay={0.2}>
              <ChartHeader icon={Globe} title="Top Nationalities" color="#06B6D4" />
              <div className="mt-2">
                {demographicsData.data.topNationalities?.slice(0, 8).map((nat: any, i: number) => (
                  <ProgressBar
                    key={nat.name}
                    name={nat.name}
                    value={nat.value}
                    max={natMax}
                    color={COLORS[i % COLORS.length]}
                    delay={0.25 + i * 0.06}
                  />
                ))}
              </div>
            </ChartCard>
          )}

          {/* Question Categories */}
          {questionsData?.success && (
            <ChartCard delay={0.25}>
              <ChartHeader icon={BarChart3} title="Question Categories" color="#10B981" />
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={questionsData.data.questionCategories} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="value" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={28} isAnimationActive animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Questions Over Time */}
          {questionsData?.success && (
            <ChartCard delay={0.3}>
              <ChartHeader icon={Activity} title="Questions Over Time" color="#8B5CF6" />
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={questionsData.data.questionsOverTime} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(139,92,246,0.3)', strokeWidth: 1 }} />
                  <Area
                    type="monotone" dataKey="questions"
                    stroke="#8B5CF6" strokeWidth={2.5}
                    fill="url(#areaGrad)"
                    dot={{ r: 3.5, fill: '#8B5CF6', stroke: '#1a1a2e', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

        {/* ── Charts row 2 ── */}
        {demographicsData?.success && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

            {/* Travel Purposes */}
            <ChartCard delay={0.35}>
              <ChartHeader icon={Sparkles} title="Travel Purposes" color="#F59E0B" />
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <defs>
                    {PIE_COLORS.map((c, i) => (
                      <radialGradient key={i} id={`travelGrad${i}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={c} stopOpacity={1} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.65} />
                      </radialGradient>
                    ))}
                  </defs>
                  <Pie
                    data={demographicsData.data.travelPurposes}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={4} cornerRadius={6}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ strokeWidth: 1, stroke: '#4B5563' }}
                    isAnimationActive animationBegin={300} animationDuration={800}
                  >
                    {demographicsData.data.travelPurposes.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={`url(#travelGrad${index % PIE_COLORS.length})`} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Group Types */}
            <ChartCard delay={0.4}>
              <ChartHeader icon={Users} title="Group Types" color="#EC4899" />
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={demographicsData.data.groupTypes} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="groupBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899" stopOpacity={1} />
                      <stop offset="100%" stopColor="#DB2777" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="value" fill="url(#groupBarGrad)" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-12" />
      </div>
    </div>
  )
}