import { AvailSlot, Config, Member, TeamAssignment } from '../types'

// Google Sheets stores time-formatted cells as Date serials anchored to
// 1899-12-30. If the Apps Script doesn't format them before returning,
// JSON.stringify converts them to ISO strings like "1899-12-29T22:30:00.000Z".
// This sanitiser detects those strings and recovers the HH:mm value using
// the UTC offset that matches the NZST epoch anchor (UTC+12 → subtract 12h).
const TIME_KEYS: (keyof Config)[] = [
  'weekday_shift_1_start', 'weekday_shift_1_end',
  'weekday_shift_2_start', 'weekday_shift_2_end',
  'weekend_shift_1_start', 'weekend_shift_1_end',
  'weekend_shift_2_start', 'weekend_shift_2_end',
]

function sanitizeConfig(raw: Config): Config {
  const out = { ...raw }
  for (const key of TIME_KEYS) {
    const val = out[key] as string
    if (typeof val === 'string' && (val.includes('1899') || val.includes('1900'))) {
      const d = new Date(val)
      // Apps Script epoch: 1899-12-30 00:00 in the script's local timezone.
      // For Pacific/Auckland (UTC+12/13) the UTC hours are shifted by the offset.
      // We recover local hours by adding the NZST offset (720 minutes) back.
      const localMinutes = d.getUTCHours() * 60 + d.getUTCMinutes() + 12 * 60
      const h = Math.floor(localMinutes / 60) % 24
      const m = localMinutes % 60
      ;(out as Record<string, unknown>)[key] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }
  return out
}

interface GasResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

async function gasGet<T>(url: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${url}?${qs}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json: GasResponse<T> = await res.json()
  if (!json.ok) throw new Error(json.error ?? 'Unknown error')
  return json.data as T
}

async function gasPost<T>(url: string, action: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...body as object }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json: GasResponse<T> = await res.json()
  if (!json.ok) throw new Error(json.error ?? 'Unknown error')
  return json.data as T
}

export async function getConfig(scriptUrl: string): Promise<Config> {
  const raw = await gasGet<Config>(scriptUrl, { action: 'getConfig' })
  return sanitizeConfig(raw)
}

export async function getMembers(scriptUrl: string): Promise<Member[]> {
  return gasGet<Member[]>(scriptUrl, { action: 'getMembers' })
}

export async function getAvailability(
  scriptUrl: string,
  member: string,
  from: string,
  to: string,
): Promise<AvailSlot[]> {
  return gasGet<AvailSlot[]>(scriptUrl, { action: 'getAvailability', member, from, to })
}

export async function getAllAvailability(
  scriptUrl: string,
  from: string,
  to: string,
): Promise<AvailSlot[]> {
  return gasGet<AvailSlot[]>(scriptUrl, { action: 'getAllAvailability', from, to })
}

export async function saveAvailability(
  scriptUrl: string,
  memberName: string,
  slots: Omit<AvailSlot, 'memberName'>[],
): Promise<{ saved: number }> {
  return gasPost<{ saved: number }>(scriptUrl, 'saveAvailability', { memberName, slots })
}

export async function getTeams(
  scriptUrl: string,
  from: string,
  to: string,
): Promise<TeamAssignment[]> {
  return gasGet<TeamAssignment[]>(scriptUrl, { action: 'getTeams', from, to })
}

export async function recomputeTeams(
  scriptUrl: string,
  from: string,
  to: string,
): Promise<{ computed: number }> {
  return gasGet<{ computed: number }>(scriptUrl, { action: 'recomputeTeams', from, to })
}
