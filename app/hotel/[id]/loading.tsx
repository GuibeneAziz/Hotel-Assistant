export default function HotelLoading() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
        <p className="text-gray-400 text-sm">Loading hotel…</p>
      </div>
    </div>
  )
}
