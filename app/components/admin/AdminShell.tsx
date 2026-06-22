'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  BarChart3,
  HelpCircle,
  Shield,
  LogOut,
  Hotel,
  User,
} from 'lucide-react'

export const ADMIN_BRAND_NAME = 'Hotel Assistant Manager'
export const ADMIN_BRAND_TAGLINE = 'Management Suite'

const TOP_CRUMBS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin/analytics', label: 'Analytics' },
] as const

export interface AdminShellProps {
  children: React.ReactNode
  pageTitle: string
  pageDescription?: string
  /** Right side of top bar (Save, Refresh, etc.) */
  headerActions?: React.ReactNode
  onLogout?: () => void
}

function AdminShellInner({
  children,
  pageTitle,
  pageDescription,
  headerActions,
  onLogout,
}: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      icon: BarChart3,
      active: pathname.startsWith('/admin/analytics'),
    },
  ]

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
      return
    }
    localStorage.removeItem('adminToken')
    router.push('/admin/login')
  }

  const isCrumbActive = (href: string) => {
    if (href === '/') return false
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href.startsWith('/admin/analytics')) return pathname.startsWith('/admin/analytics')
    return false
  }

  return (
    <div className="admin-layout luxury-page flex min-h-screen">
      {/* ── Left sidebar ── */}
      <aside className="admin-sidebar hidden lg:flex">
        <div className="flex h-full flex-col px-4 py-6">
          <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-luxury-gold">
              <Hotel className="h-5 w-5 text-luxury-bg" />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-sm font-semibold leading-tight text-luxury-gold">{ADMIN_BRAND_NAME}</p>
              <p className="text-[10px] uppercase tracking-wider text-luxury-muted">{ADMIN_BRAND_TAGLINE}</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-item ${item.active ? 'admin-nav-item-active' : ''}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto space-y-3 pt-6">
            <div className="border-t border-white/10 pt-4">
              <a
                href="mailto:support@sindbad-hammamet.com"
                className="admin-nav-item !min-h-0 !py-2 text-xs"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Help
              </a>
              <Link href="/" className="admin-nav-item !min-h-0 !py-2 text-xs">
                <Shield className="h-3.5 w-3.5" />
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="admin-topbar sticky top-0 z-30">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            {/* Mobile brand */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-luxury-gold">
                <Hotel className="h-4 w-4 text-luxury-bg" />
              </div>
              <span className="font-serif text-sm font-semibold text-luxury-gold">Assistant</span>
            </div>

            {/* Center breadcrumbs — desktop */}
            <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
              {TOP_CRUMBS.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1">
                  {i > 0 && <span className="text-luxury-muted/50">/</span>}
                  <Link
                    href={crumb.href}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isCrumbActive(crumb.href)
                        ? 'text-luxury-gold'
                        : 'text-luxury-muted hover:text-white'
                    }`}
                  >
                    {crumb.label}
                  </Link>
                </span>
              ))}
            </nav>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-2">
              {headerActions}
              <button
                type="button"
                onClick={handleLogout}
                className="btn-luxury-outline hidden !min-h-0 !py-2 !px-4 text-sm sm:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-luxury-muted hover:border-luxury-gold/40 hover:text-luxury-gold sm:hidden"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <div
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-luxury-gold/30 bg-luxury-gold/10 sm:flex"
                title="Admin"
              >
                <User className="h-5 w-5 text-luxury-gold" />
              </div>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                    item.active ? 'bg-luxury-gold text-luxury-bg' : 'text-luxury-muted'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </header>

        {/* Page content */}
        <main className="admin-main flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <motion.header
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="font-serif text-2xl font-semibold text-white sm:text-3xl">{pageTitle}</h1>
              {pageDescription ? (
                <p className="mt-2 max-w-2xl text-sm text-luxury-muted sm:text-base">{pageDescription}</p>
              ) : null}
            </motion.header>

            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AdminShell(props: AdminShellProps) {
  return (
    <Suspense
      fallback={
        <div className="luxury-page flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold" />
        </div>
      }
    >
      <AdminShellInner {...props} />
    </Suspense>
  )
}
