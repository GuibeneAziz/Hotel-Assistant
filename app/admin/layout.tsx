'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'
  const [isAuthenticated, setIsAuthenticated] = useState(isLoginPage)
  const [isLoading, setIsLoading] = useState(!isLoginPage)

  useEffect(() => {
    if (isLoginPage) {
      setIsAuthenticated(true)
      setIsLoading(false)
      return
    }

    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }

    fetch('/api/admin/verify', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem('adminToken')
          router.push('/admin/login')
        }
      })
      .catch(() => {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isLoginPage, router])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="luxury-page flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-luxury-gold">
            <Shield className="h-8 w-8 text-luxury-bg" />
          </div>
          <p className="text-luxury-muted">Verifying authentication...</p>
        </motion.div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
