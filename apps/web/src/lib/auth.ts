'use client'

const TOKEN_KEY = 'auth_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${TOKEN_KEY}=`))
    ?.split('=')[1] ?? null
}

export function setToken(token: string) {
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

export function removeToken() {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`
}

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
  setToken(data.token)
  return data
}

export function logout() {
  removeToken()
  window.location.href = '/login'
}
