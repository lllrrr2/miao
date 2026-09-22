import type { ApiResponse, VersionInfo } from '../types/api'
import { fetchJson } from './request'

export const UPGRADE_RESTART_TIMEOUT_MS = 30_000

// Confirm the version, not data-plane health: an installed version can still
// be initializing. Never equate a different (possibly rolled-back) version
// with the requested release.
export async function waitForUpgrade(target: string, previous: string): Promise<void> {
  const deadline = Date.now() + UPGRADE_RESTART_TIMEOUT_MS
  let observed: string | undefined
  while (Date.now() < deadline) {
    await new Promise(resolve => window.setTimeout(resolve, Math.min(500, deadline - Date.now())))
    const remaining = deadline - Date.now()
    if (remaining <= 0) break
    try {
      const payload = await fetchJson<ApiResponse<VersionInfo>>('/api/version', {}, Math.min(2000, remaining))
      if (!payload.success || !payload.data?.current) continue
      observed = payload.data.current
      if (observed.replace(/^v/, '') === target.replace(/^v/, '')) return
    } catch {
      // A restart temporarily makes the endpoint unreachable.
    }
  }
  if (observed === previous) {
    throw new Error('尚未确认目标版本，服务仍报告旧版本（可能尚未重启或已回滚）；请刷新状态确认，勿重复升级')
  }
  throw new Error(observed
    ? `尚未确认目标版本，当前版本为 ${observed}；请刷新状态确认`
    : '等待服务重启超时，升级结果未知；请手动刷新页面确认')
}
