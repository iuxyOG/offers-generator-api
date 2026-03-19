'use client'

export async function login(email: string, password: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Erro ao fazer login')
  }

  const data = await res.json()

  // Set HttpOnly cookie via API route
  await fetch('/api/auth/set-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: data.token }),
  })

  // Set non-sensitive user info in a readable cookie for the UI
  const userInfo = { tenantId: data.tenantId, userId: data.userId, email: data.email }
  document.cookie = `user_info=${encodeURIComponent(JSON.stringify(userInfo))}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`

  return data
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  document.cookie = 'user_info=; path=/; max-age=0'
  window.location.href = '/login'
}
