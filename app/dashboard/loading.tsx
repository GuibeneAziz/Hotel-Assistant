export default function DashboardLoading() {
  return (
    <div className="luxury-page flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-luxury-gold/30 border-t-luxury-gold" />
        <p className="text-sm text-luxury-muted">Loading dashboard…</p>
      </div>
    </div>
  )
}
