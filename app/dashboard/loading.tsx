export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
        <p className="text-gray-400 text-sm">Loading dashboard…</p>
      </div>
    </div>
  )
}
