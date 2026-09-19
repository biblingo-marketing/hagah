import { useEffect, useState } from 'react'

/**
 * Hash routing. No server, no build-time routes, works from any static host
 * and survives a hard refresh on the phone.
 */
export function useRoute(): [string, (to: string) => void] {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const go = (to: string) => {
    window.location.hash = to
    window.scrollTo(0, 0)
  }
  return [route, go]
}

export function navigate(to: string) {
  window.location.hash = to
  window.scrollTo(0, 0)
}
