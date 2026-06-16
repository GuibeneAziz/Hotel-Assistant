export default function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="luxury-page flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold" />
        <h1 className="font-serif text-xl font-medium text-luxury-gold">{message}</h1>
      </div>
    </div>
  )
}
