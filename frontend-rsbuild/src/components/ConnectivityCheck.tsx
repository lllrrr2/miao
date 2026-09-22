import { useEffect, useRef, useState } from 'react'
import { Activity, X } from 'lucide-react'
import { ICON } from '../tokens'
import { API_HEADERS, DELAY_TEST_URL } from '../utils'
import { fetchJson } from '../hooks/request'
import { useDialog } from '../hooks/useDialog'
import { Button } from './ui'
import type { ApiResponse, ConnectivityResult, StatusData } from '../types/api'

function describeResult(result: ConnectivityResult): string {
  if (result.success) {
    const status = result.http_status
    if (!status) return '收到 HTTP 响应，但后端未提供状态码；不能据此判断网站访问正常。'
    if (status >= 400) return `收到 HTTP ${status}：已收到目标响应，但访问未成功。检查网址、站点访问限制，或在浏览器中核对；部分站点不支持 HEAD 请求。`
    return `收到 HTTP ${status}：本次 HEAD 请求完成，不代表页面内容、登录或浏览器访问一定正常。`
  }
  if (result.error_kind === 'timeout') return '请求超时：5 秒内未完成。检查主机网络和目标站点，必要时换一个网址对照测试。'
  if (result.error_kind === 'connect') return '连接未建立：请检查地址、主机网络和 DNS；此结果无法单独判断是 DNS、TLS 还是目标服务问题。'
  return '请求未完成：请检查网址和下方错误详情，再重试。'
}

export function ConnectivityCheck({ status, backendUnreachable }: { status: StatusData; backendUnreachable: boolean }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(DELAY_TEST_URL)
  const [pending, setPending] = useState(false)
  const [validation, setValidation] = useState('')
  const [report, setReport] = useState('')
  const [summary, setSummary] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const request = useRef<AbortController | null>(null)
  const reportRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useDialog(open, () => setOpen(false))
  useEffect(() => () => { request.current?.abort(); request.current = null }, [])
  const service = backendUnreachable ? '后端不可达，服务状态未知' : status.ready ? '代理服务已就绪' : status.phase === 'stopped' ? '代理服务已停止' : '代理服务尚未就绪'

  const runCheck = async () => {
    if (request.current) return
    const target = url.trim()
    try {
      const parsed = new URL(target)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol')
    } catch {
      setValidation('请输入完整的 HTTP 或 HTTPS 网址。')
      return
    }
    setValidation('')
    setCopyMessage('')
    setPending(true)
    const controller = new AbortController()
    request.current = controller
    const startedAt = new Date().toLocaleString()
    let conclusion: string
    let details = ''
    try {
      const response = await fetchJson<ApiResponse<ConnectivityResult>>('/api/connectivity', {
        method: 'POST', headers: API_HEADERS, body: JSON.stringify({ url: target }), signal: controller.signal,
      })
      if (!response.success || !response.data) throw new Error(response.message || '后端未返回检查结果')
      conclusion = describeResult(response.data)
      details = `耗时：${response.data.latency_ms == null ? '无测量结果' : `${response.data.latency_ms} ms`}\n错误类型：${response.data.error_kind || '无'}\n错误详情：${response.data.error || '无'}`
    } catch (error) {
      conclusion = '未能取得后端检查结果；这不代表目标网站不可达。请确认 Miao 后端连接后重试。'
      details = `错误详情：${error instanceof Error ? error.message : String(error)}`
    }
    if (request.current !== controller) return
    setSummary(conclusion)
    setReport(`Miao 连接检查\n开始时间：${startedAt}\n完成时间：${new Date().toLocaleString()}\n检查开始时：${service}\n目标：${target}\n方法：HEAD，超时 5 秒\n范围：Miao 所在主机；不使用代理环境变量，仍可能经过系统 TUN/路由。不是指定节点或浏览器测试。\n结论：${conclusion}\n${details}`)
    request.current = null
    setPending(false)
  }

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report)
      setCopyMessage('已复制检查报告')
    } catch {
      reportRef.current?.focus()
      reportRef.current?.select()
      setCopyMessage('无法自动复制，已选中报告，请手动复制。')
    }
  }

  return (
    <>
      <div className="connectivity-summary">
        <span>{service} · 网站可达性需单独检查</span>
        <Button tone="secondary" size="sm" icon={<Activity size={ICON.sm} />} onClick={() => setOpen(true)}>连接检查</Button>
      </div>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div ref={dialogRef} className="modal-card connectivity-dialog" role="dialog" aria-modal="true" aria-label="连接检查" tabIndex={-1} onClick={event => event.stopPropagation()}>
            <div className="modal-title-row"><h3>连接检查</h3><button className="icon-button" aria-label="关闭连接检查" onClick={() => setOpen(false)}><X size={ICON.sm} /></button></div>
            <p role="status">{service}</p>
            <p>从运行 Miao 的主机发送 HEAD 请求，不使用代理环境变量，但仍可能经过系统 TUN/路由。不代表浏览器或指定节点可用，也不会修改配置。</p>
            <label className="field"><span>目标网址</span><input data-autofocus aria-label="目标网址" value={url} disabled={pending} onChange={event => setUrl(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void runCheck() }} /></label>
            {validation && <p role="alert">{validation}</p>}
            <Button tone="primary" loading={pending} onClick={runCheck}>开始检查</Button>
            <p>{pending ? '检查中。关闭窗口不会中止检查；再次打开可查看结果。' : '仅在点击时检查。结果保留到下次检查完成或页面刷新。'}</p>
            {report && <section aria-label="最近一次检查结果">
              <p role="status">{pending ? '以下为上一次结果：' : ''}{summary}</p>
              <textarea ref={reportRef} readOnly rows={7} value={report} aria-label="检查报告" />
              <Button tone="secondary" size="sm" onClick={copyReport}>复制检查报告</Button>
              {copyMessage && <p role="status">{copyMessage}</p>}
            </section>}
          </div>
        </div>
      )}
    </>
  )
}
