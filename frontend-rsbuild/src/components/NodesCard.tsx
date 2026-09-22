import { memo } from 'react'
import { LoaderCircle, Plus, Server, Trash2, Zap } from 'lucide-react'
import { ICON } from '../tokens'
import { Button, SectionCard } from './ui'
import { protocolTone, classNames, formatDelay, formatDelayTime } from '../utils'
import type { NodeInfo } from '../types/api'

interface NodeRowProps {
  node: NodeInfo
  onDelete: (tag: string) => void
  disabled: boolean
  delay?: number
  measuredAt?: number
  isTesting: boolean
  testDisabled: boolean
  onTestDelay: (tag: string) => void
}

const NodeRow = memo(function NodeRow({ node, onDelete, disabled, delay, measuredAt, isTesting, testDisabled, onTestDelay }: NodeRowProps) {
  return (
    <div className="list-row node-row">
      <div className="list-row-content">
        <div className="list-row-title" title={node.tag}>{node.tag}</div>
        {(isTesting || delay !== undefined) && (
          <div className="list-row-meta" role="status">{isTesting ? '测试延迟中…' : `${formatDelay(delay)} · ${formatDelayTime(measuredAt)}`}</div>
        )}
      </div>
      <span className={classNames('badge', protocolTone(node.node_type))} title={node.node_type}>{node.node_type}</span>
      <button
        type="button"
        className="icon-button subtle"
        onClick={() => onTestDelay(node.tag)}
        disabled={testDisabled || isTesting}
        aria-label={`测试 ${node.tag} 延迟`}
        aria-busy={isTesting || undefined}
        title={testDisabled ? '代理就绪后可测试延迟' : '测试到检测站点的延迟，不是下载速度'}
      >
        {isTesting ? <LoaderCircle size={ICON.xs} className="spin" /> : <Zap size={ICON.xs} />}
      </button>
      <button
        className="icon-button subtle"
        onClick={() => onDelete(node.tag)}
        disabled={disabled}
        aria-label={`删除节点 ${node.tag}`}
      >
        <Trash2 size={ICON.xs} />
      </button>
    </div>
  )
})

export interface NodesCardProps {
  nodes: NodeInfo[]
  isInitializing: boolean
  isReady: boolean
  delays: Record<string, number>
  delayMeasuredAt?: Record<string, number>
  testingNodes: Record<string, boolean>
  onTestDelay: (tag: string) => void
  onDeleteNode: (tag: string) => void
  onOpenAddNode: () => void
}

export function NodesCard({ nodes, isInitializing, isReady, delays, delayMeasuredAt = {}, testingNodes, onTestDelay, onDeleteNode, onOpenAddNode }: NodesCardProps) {
  return (
    <SectionCard
      bodyClassName="panel-body-tight"
      header={
        <div className="section-header">
          <div className="section-title-wrap">
            <Server size={ICON.sm} className="section-icon" />
            <span>手动节点</span>
            <span className={classNames('badge', 'counter-pill')}>{nodes.length}</span>
          </div>
          <Button
            tone="secondary"
            size="sm"
            icon={<Plus size={ICON.xs} />}
            disabled={isInitializing}
            onClick={onOpenAddNode}
          >
            添加
          </Button>
        </div>
      }
    >
      <div className="list-stack">
        {nodes.length === 0 
          ? <div className="empty-block">暂无手动节点</div> 
          : nodes.map((node) => (
            <NodeRow
              key={node.tag}
              node={node}
              onDelete={onDeleteNode}
              disabled={isInitializing}
              delay={delays[node.tag]}
              measuredAt={delayMeasuredAt[node.tag]}
              isTesting={Boolean(testingNodes[node.tag])}
              testDisabled={isInitializing || !isReady}
              onTestDelay={onTestDelay}
            />
          ))}
      </div>
    </SectionCard>
  )
}
