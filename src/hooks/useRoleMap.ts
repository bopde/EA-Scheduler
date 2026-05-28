import { useMemo } from 'react'
import { useSessionStore } from '../store/sessionStore'

export function useRoleMap() {
  const members = useSessionStore((s) => s.members)
  return useMemo(() => new Map(members.map((m) => [m.name, m.role])), [members])
}
