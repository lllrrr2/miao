import { afterEach, expect, it, rs } from '@rstest/core'
import { waitForUpgrade, UPGRADE_RESTART_TIMEOUT_MS } from './upgrade'

afterEach(() => { rs.useRealTimers(); rs.unstubAllGlobals() })

it('waits for the exact target, allowing the release v prefix', async () => {
  rs.useFakeTimers()
  const fetchMock = rs.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { current: '0.47.0' } }) })
    .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { current: '0.49.0' } }) })
  rs.stubGlobal('fetch', fetchMock)
  let done = false
  const result = waitForUpgrade('v0.49.0', '0.48.1').then(() => { done = true })
  await rs.advanceTimersByTimeAsync(500)
  expect(done).toBe(false)
  await rs.advanceTimersByTimeAsync(500)
  await result
  expect(done).toBe(true)
})

it('enforces the total deadline even when every version fetch hangs', async () => {
  rs.useFakeTimers()
  rs.stubGlobal('fetch', rs.fn(() => new Promise(() => {})))
  const result = waitForUpgrade('0.49.0', '0.48.1').catch(error => error)
  await rs.advanceTimersByTimeAsync(UPGRADE_RESTART_TIMEOUT_MS)
  expect((await result as Error).message).toContain('升级结果未知')
})

it('does not claim success or certain rollback when the old version remains', async () => {
  rs.useFakeTimers()
  rs.stubGlobal('fetch', rs.fn(async () => ({ ok: true, json: async () => ({ success: true, data: { current: '0.48.1' } }) })))
  const result = waitForUpgrade('0.49.0', '0.48.1').catch(error => error)
  await rs.advanceTimersByTimeAsync(UPGRADE_RESTART_TIMEOUT_MS)
  expect((await result as Error).message).toContain('可能尚未重启或已回滚')
})
