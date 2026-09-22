import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, rs } from '@rstest/core'
import { useWebSocket } from './useWebSocket'

class Socket {
  static CONNECTING = 0
  static OPEN = 1
  static instances: Socket[] = []
  readyState = 1
  onclose: (() => void) | null = null
  onopen: (() => void) | null = null
  onerror = null
  onmessage = null
  constructor() { Socket.instances.push(this) }
  close() { this.readyState = 3 }
}

afterEach(() => {
  rs.useRealTimers()
  rs.unstubAllGlobals()
  Reflect.deleteProperty(document, 'hidden')
  Socket.instances = []
})

function visibility(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

it('does not reconnect when the retained socket closes after the page becomes hidden', async () => {
  rs.useFakeTimers()
  rs.stubGlobal('WebSocket', Socket)
  visibility(false)
  const { unmount } = renderHook(() => useWebSocket('ws://localhost/mock', () => {}))
  expect(Socket.instances).toHaveLength(1)
  act(() => visibility(true))
  act(() => Socket.instances[0].onclose?.())
  await act(async () => { await rs.advanceTimersByTimeAsync(60_000) })
  expect(Socket.instances).toHaveLength(1)
  act(() => visibility(false))
  expect(Socket.instances).toHaveLength(2)
  act(() => Socket.instances[1].onclose?.())
  await act(async () => { await rs.advanceTimersByTimeAsync(1500) })
  expect(Socket.instances).toHaveLength(3)
  unmount()
  await rs.advanceTimersByTimeAsync(60_000)
  expect(Socket.instances).toHaveLength(3)
})

it('does not open an initial connection in a hidden page', () => {
  rs.stubGlobal('WebSocket', Socket)
  visibility(true)
  renderHook(() => useWebSocket('ws://localhost/mock', () => {}))
  expect(Socket.instances).toHaveLength(0)
  act(() => visibility(false))
  expect(Socket.instances).toHaveLength(1)
})
