import { useCallback, useEffect, useRef, useState } from 'react'
import { getAvailability, saveAvailability } from '../api/gasClient'
import { AvailSlot, SaveStatus } from '../types'
import { slotKey } from '../utils/dateUtils'

type PendingSlot = { date: string; shiftIndex: 0 | 1; available: boolean }

export function useAvailability(
  scriptUrl: string,
  memberName: string,
  from: string,
  to: string,
) {
  const [availability, setAvailability] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // Pending changes keyed by slot key — last write wins per slot
  const pending = useRef<Map<string, PendingSlot>>(new Map())
  // Original values before the current unsaved batch, for rollback
  const originals = useRef<Map<string, boolean>>(new Map())
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cache = useRef<Map<string, AvailSlot[]>>(new Map())

  useEffect(() => {
    if (!scriptUrl || !memberName || !from || !to) return
    const cacheKey = `${memberName}:${from}:${to}`
    if (cache.current.has(cacheKey)) {
      const slots = cache.current.get(cacheKey)!
      setAvailability(new Map(slots.map((s) => [slotKey(s.date, s.shiftIndex), s.available])))
      return
    }
    setLoading(true)
    getAvailability(scriptUrl, memberName, from, to)
      .then((slots) => {
        cache.current.set(cacheKey, slots)
        setAvailability(new Map(slots.map((s) => [slotKey(s.date, s.shiftIndex), s.available])))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [scriptUrl, memberName, from, to])

  const toggleSlot = useCallback(
    (date: string, shiftIndex: 0 | 1) => {
      const key = slotKey(date, shiftIndex)

      setAvailability((m) => {
        const prev = m.get(key) ?? false
        const next = !prev

        // Record original value the first time this slot is touched in the batch
        if (!originals.current.has(key)) {
          originals.current.set(key, prev)
        }

        pending.current.set(key, { date, shiftIndex, available: next })
        return new Map(m).set(key, next)
      })

      setSaveStatus('saving')

      // Reset the 2-second batch timer on every toggle
      if (batchTimer.current) clearTimeout(batchTimer.current)
      batchTimer.current = setTimeout(async () => {
        const changes = Array.from(pending.current.values())
        const savedOriginals = new Map(originals.current)
        pending.current.clear()
        originals.current.clear()
        batchTimer.current = null

        try {
          await saveAvailability(scriptUrl, memberName, changes)
          cache.current.clear()
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000)
        } catch {
          // Roll back every slot in this batch to its pre-batch value
          setAvailability((m) => {
            const next = new Map(m)
            for (const [k, orig] of savedOriginals) next.set(k, orig)
            return next
          })
          setSaveStatus('error')
        }
      }, 2000)
    },
    [scriptUrl, memberName],
  )

  return { availability, loading, saveStatus, toggleSlot }
}
