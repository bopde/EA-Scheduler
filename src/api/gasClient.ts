import { AvailSlot, Config, Member, TeamAssignment } from '../types'

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
  return gasGet<Config>(scriptUrl, { action: 'getConfig' })
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
