export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('adminToken')
  return token && token !== 'null' ? token : null
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('adminToken')
}

export function redirectToAdminLogin(message?: string): void {
  clearAdminSession()
  if (message) {
    sessionStorage.setItem('adminLoginMessage', message)
  }
  window.location.href = '/admin/login'
}

export function readAdminLoginMessage(): string | null {
  if (typeof window === 'undefined') return null
  const message = sessionStorage.getItem('adminLoginMessage')
  if (message) sessionStorage.removeItem('adminLoginMessage')
  return message
}

export function isUnauthorizedResponse(response: Response): boolean {
  return response.status === 401
}
