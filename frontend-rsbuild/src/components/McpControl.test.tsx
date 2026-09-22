import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, rs } from '@rstest/core'
import { McpControl } from './McpControl'

function renderControl(props = {}) {
  return render(
    <McpControl
      enabled={false}
      pending={false}
      onToggle={rs.fn()}
      showToast={rs.fn()}
      {...props}
    />,
  )
}

describe('McpControl', () => {
  it('reflects the toggle state and calls onToggle with the target state', async () => {
    const user = userEvent.setup()
    const onToggle = rs.fn()
    renderControl({ enabled: false, onToggle })

    const toggle = screen.getByRole('switch', { name: 'MCP 端点开关' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await user.click(toggle)
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('shows enabled state and blocks clicks while pending', () => {
    renderControl({ enabled: true, pending: true })

    const toggle = screen.getByRole('switch', { name: 'MCP 端点开关' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(toggle).toBeDisabled()
  })

  it('copies the exact MCP add command for each agent', async () => {
    const user = userEvent.setup()
    const writeText = rs.fn().mockResolvedValue(undefined)
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    try {
      const showToast = rs.fn()
      renderControl({ showToast })
      const url = `${window.location.origin}/mcp`

      await user.click(screen.getByRole('button', { name: '复制 Claude MCP 添加命令' }))
      await user.click(screen.getByRole('button', { name: '复制 Codex MCP 添加命令' }))
      expect(screen.getAllByRole('button')).toHaveLength(2)

      expect(writeText).toHaveBeenNthCalledWith(1, `claude mcp add --transport http miao ${url}`)
      expect(writeText).toHaveBeenNthCalledWith(2, `codex mcp add miao --url ${url}`)
      expect(writeText).toHaveBeenCalledTimes(2)
      expect(showToast).toHaveBeenNthCalledWith(1, '已复制 Claude MCP 添加命令', 'success')
      expect(showToast).toHaveBeenNthCalledWith(2, '已复制 Codex MCP 添加命令', 'success')
    } finally {
      if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
      else Reflect.deleteProperty(navigator, 'clipboard')
    }
  })

  it('reports fallback copy failure and removes the temporary field', async () => {
    const user = userEvent.setup()
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: rs.fn().mockReturnValue(false),
    })
    try {
      const showToast = rs.fn()
      renderControl({ showToast })

      await user.click(screen.getByRole('button', { name: '复制 Claude MCP 添加命令' }))

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('复制失败，请手动复制：claude mcp add'),
        'error',
      )
      expect(document.querySelector('textarea')).not.toBeInTheDocument()
    } finally {
      if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
      else Reflect.deleteProperty(navigator, 'clipboard')
      if (execCommandDescriptor) Object.defineProperty(document, 'execCommand', execCommandDescriptor)
      else Reflect.deleteProperty(document, 'execCommand')
    }
  })
})
