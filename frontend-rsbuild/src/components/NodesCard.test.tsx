import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, rs } from '@rstest/core'
import { NodesCard } from './NodesCard'
import { nodeMock } from '../testFixtures'

const nodes = [
  nodeMock({ tag: '香港节点', node_type: 'hysteria2' }),
  nodeMock({ tag: 'vps-1', node_type: 'trojan' }),
]

function renderCard(props = {}) {
  return render(
    <NodesCard
      nodes={nodes}
      isInitializing={false}
      isReady={true}
      delays={{}}
      testingNodes={{}}
      onTestDelay={rs.fn()}
      onDeleteNode={rs.fn()}
      onOpenAddNode={rs.fn()}
      {...props}
    />,
  )
}

describe('NodesCard', () => {
  it('labels retained nodes as stale and retries without deleting or testing them', async () => {
    const user = userEvent.setup()
    const onRetry = rs.fn().mockResolvedValue(null)
    const onDeleteNode = rs.fn()
    const onTestDelay = rs.fn()
    renderCard({ loadError: 'read timeout', onRetry, onDeleteNode, onTestDelay })
    expect(screen.getByRole('alert')).toHaveTextContent('保留上次读取的数据')
    expect(screen.getByText('vps-1')).toBeInTheDocument()
    await user.click(screen.getByText('错误详情'))
    expect(screen.getByText('read timeout')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '重新读取手动节点' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onDeleteNode).not.toHaveBeenCalled()
    expect(onTestDelay).not.toHaveBeenCalled()
  })

  it('keeps the protocol badge as a direct row child so the grid can right-align it', () => {
    renderCard()

    const rows = document.querySelectorAll('.list-row.node-row')
    expect(rows).toHaveLength(nodes.length)
    for (const row of rows) {
      // 徽章必须是行的直接子元素：.node-row 的网格按直接子元素分列右对齐，
      // 塞回 .list-row-title 里徽章会退回紧跟文字左侧，各行右缘不再对齐。
      expect(row.querySelector(':scope > .badge')).not.toBeNull()
      expect(row.querySelector('.list-row-title .badge')).toBeNull()
      expect(row.querySelector(':scope > .icon-button')).not.toBeNull()
    }
    expect(screen.getByText('hysteria2')).toBeInTheDocument()
    expect(screen.getByText('trojan')).toBeInTheDocument()
  })

  it('truncates long tags inside the content column without squeezing the badge', () => {
    renderCard({ nodes: [nodeMock({ tag: 'very-long-node-tag-'.repeat(8) })] })

    const row = document.querySelector('.list-row.node-row')!
    expect(row.querySelector('.list-row-content > .list-row-title')).not.toBeNull()
    expect(row.querySelector(':scope > .badge')).not.toBeNull()
  })

  it('calls onDeleteNode with the tag when the delete button is clicked', async () => {
    const user = userEvent.setup()
    const onDeleteNode = rs.fn()
    renderCard({ onDeleteNode })

    await user.click(screen.getByRole('button', { name: '删除节点 香港节点' }))
    expect(onDeleteNode).toHaveBeenCalledWith('香港节点')
  })

  it('renders an empty state when there are no manual nodes', () => {
    renderCard({ nodes: [] })

    expect(screen.getByText('暂无手动节点')).toBeInTheDocument()
  })

  it('tests the selected tag without deleting it', async () => {
    const user = userEvent.setup()
    const onTestDelay = rs.fn()
    const onDeleteNode = rs.fn()
    renderCard({ onTestDelay, onDeleteNode })
    await user.click(screen.getByRole('button', { name: '测试 vps-1 延迟' }))
    expect(onTestDelay).toHaveBeenCalledExactlyOnceWith('vps-1')
    expect(onDeleteNode).not.toHaveBeenCalled()
  })

  it('shows per-node results and blocks only the node being tested', () => {
    renderCard({ delays: { 香港节点: 42, 'vps-1': -1 }, testingNodes: { 香港节点: true } })
    expect(screen.getByRole('button', { name: '测试 香港节点 延迟' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '测试 香港节点 延迟' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: '测试 vps-1 延迟' })).toBeEnabled()
    expect(screen.getByText('测试延迟中…')).toBeInTheDocument()
    expect(screen.getByText(/超时 · 测试时间未知/)).toBeInTheDocument()
    expect(screen.queryByText('42 ms')).not.toBeInTheDocument()
  })

  it('shows measured latency', () => {
    renderCard({ delays: { 'vps-1': 137 }, delayMeasuredAt: { 'vps-1': new Date(2026, 8, 22, 13, 24, 56).getTime() } })
    expect(screen.getByRole('status')).toHaveTextContent('137 ms')
    expect(screen.getByRole('status')).toHaveTextContent('测于 09/22 13:24:56')
  })

  it.each([{ isReady: false }, { isInitializing: true }])('disables testing when unavailable: %j', (props) => {
    renderCard(props)
    expect(screen.getByRole('button', { name: '测试 香港节点 延迟' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '测试 vps-1 延迟' })).toBeDisabled()
  })
})
