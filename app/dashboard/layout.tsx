'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('adminToken')
    
    if (!token) {
      // No token, redirect to login
      router.push('/admin/login')
      return
    }

    // Verify token with API
    fetch('/api/admin/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true)
        } else {
          // Invalid token, redirect to login
          localStorage.removeItem('adminToken')
          router.push('/admin/login')
        }
      })
      .catch(() => {
        // Error verifying, redirect to login
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Verifying authentication...</p>
        </motion.div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect
  }

  return <>{children}</>
}
