import { useEffect, useState } from 'react'

export function useMounted() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => setIsMounted(true))
      return
    }

    setTimeout(() => setIsMounted(true), 0)
  }, [])

  return isMounted
}
