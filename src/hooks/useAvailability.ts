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

  const pending = useRef<Map<string, PendingSlot>>(new Map())
  const originals = useRef<Map<string, boolean>>(new Map())
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks the 'saved'→'idle' auto-clear timer so it can be cancelled
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Increments each time a batch fires; lets each batch detect if a newer one superseded it
  const saveGen = useRef(0)
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

  // Cancel any live timers on unmount so we don't write stale data or update unmounted state
  useEffect(() => {
    return () => {
      if (batchTimer.current) clearTimeout(batchTimer.current)
      if (clearTimer.current) clearTimeout(clearTimer.current)
    }
  }, [])

  const toggleSlot = useCallback(
    (date: string, shiftIndex: 0 | 1) => {
      const key = slotKey(date, shiftIndex)

      setAvailability((m) => {
        const prev = m.get(key) ?? false
        const next = !prev
        if (!originals.current.has(key)) {
          originals.current.set(key, prev)
        }
        pending.current.set(key, { date, shiftIndex, available: next })
        return new Map(m).set(key, next)
      })

      if (batchTimer.current) clearTimeout(batchTimer.current)
      batchTimer.current = setTimeout(async () => {
        // Claim a generation number before clearing refs so concurrent batches
        // can tell which one is newest and avoid overwriting each other's status.
        const gen = ++saveGen.current
        const changes = Array.from(pending.current.values())
        const savedOriginals = new Map(originals.current)
        pending.current.clear()
        originals.current.clear()
        batchTimer.current = null

        setSaveStatus('saving')
        try {
          await saveAvailability(scriptUrl, memberName, changes)
          cache.current.clear()
          // Only update status if no newer batch has fired since this one started
          if (saveGen.current === gen) {
            setSaveStatus('saved')
            if (clearTimer.current) clearTimeout(clearTimer.current)
            clearTimer.current = setTimeout(
              () => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)),
              2000,
            )
          }
        } catch {
          // Always roll back this batch's optimistic changes regardless of generation
          setAvailability((m) => {
            const next = new Map(m)
            for (const [k, orig] of savedOriginals) next.set(k, orig)
            return next
          })
          if (saveGen.current === gen) {
            setSaveStatus('error')
          }
        }
      }, 2000)
    },
    [scriptUrl, memberName],
  )

  return { availability, loading, saveStatus, toggleSlot }
}
