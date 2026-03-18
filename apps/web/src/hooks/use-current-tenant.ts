'use client'

import { useState, useEffect } from 'react'
import { getToken } from '@/lib/auth'

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

const EMPTY = { tenantId: null, userId: null, email: null }

export function useCurrentTenant() {
  const [data, setData] = useState<{
    tenantId: string | null
    userId: string | null
    email: string | null
  }>(EMPTY)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setData(EMPTY)
      return
    }
    const payload = parseJwt(token)
    setData({
      tenantId: (payload?.tenantId as string) ?? null,
      userId: (payload?.userId as string) ?? null,
      email: (payload?.email as string) ?? null,
    })
  }, [])

  return data
}
