import { useCallback, useEffect, useRef, useState } from 'react'
import { getAvailability, saveAvailability } from '../api/gasClient'
import { AvailSlot, SaveStatus } from '../types'
import { slotKey } from '../utils/dateUtils'

export function useAvailability(
  scriptUrl: string,
  memberName: string,
  from: string,
  to: string,
) {
  const [availability, setAvailability] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const cache = useRef<Map<string, AvailSlot[]>>(new Map())

  useEffect(() => {
    if (!scriptUrl || !memberName || !from || !to) return
    const cacheKey = `${memberName}:${from}:${to}`
    if (cache.current.has(cacheKey)) {
      const slots = cache.current.get(cacheKey)!
      const map = new Map(slots.map((s) => [slotKey(s.date, s.shiftIndex), s.available]))
      setAvailability(map)
      return
    }
    setLoading(true)
    getAvailability(scriptUrl, memberName, from, to)
      .then((slots) => {
        cache.current.set(cacheKey, slots)
        const map = new Map(slots.map((s) => [slotKey(s.date, s.shiftIndex), s.available]))
        setAvailability(map)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [scriptUrl, memberName, from, to])

  const toggleSlot = useCallback(
    (date: string, shiftIndex: 0 | 1) => {
      const key = slotKey(date, shiftIndex)
      const prev = availability.get(key) ?? false
      const next = !prev

      setAvailability((m) => new Map(m).set(key, next))
      setSaveStatus('saving')

      const existing = debounceRef.current.get(key)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(async () => {
        try {
          await saveAvailability(scriptUrl, memberName, [
            { date, shiftIndex, available: next },
          ])
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
          // Invalidate cache for this range
          cache.current.clear()
        } catch {
          setAvailability((m) => new Map(m).set(key, prev))
          setSaveStatus('error')
        }
        debounceRef.current.delete(key)
      }, 500)

      debounceRef.current.set(key, timer)
    },
    [availability, scriptUrl, memberName],
  )

  return { availability, loading, saveStatus, toggleSlot }
}
