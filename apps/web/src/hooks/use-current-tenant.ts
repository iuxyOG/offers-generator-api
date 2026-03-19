'use client'

import { useState, useEffect } from 'react'

const EMPTY = { tenantId: null, userId: null, email: null }

function getUserInfo(): { tenantId: string; userId: string; email: string } | null {
  if (typeof window === 'undefined') return null
  const cookie = document.cookie
    .split('; ')
    .find((c) => c.startsWith('user_info='))
    ?.split('=')[1]
  if (!cookie) return null
  try {
    return JSON.parse(decodeURIComponent(cookie))
  } catch {
    return null
  }
}

export function useCurrentTenant() {
  const [data, setData] = useState<{
    tenantId: string | null
    userId: string | null
    email: string | null
  }>(EMPTY)

  useEffect(() => {
    const info = getUserInfo()
    if (!info) {
      setData(EMPTY)
      return
    }
    setData({
      tenantId: info.tenantId ?? null,
      userId: info.userId ?? null,
      email: info.email ?? null,
    })
  }, [])

  return data
}
