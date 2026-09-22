// 自定义规则的实时效果描述 + 落盘 JSON 预览。
// JSON 形状与后端保存到 config.yaml 的 custom_rules 条目一致
// （handlers/rules.rs build_rule_json：仅 port 转数字；reject 无 outbound）。

const FIELD_SENTENCE: Record<string, (value: string) => string> = {
  domain_suffix: (v) => `访问 ${v} 及其子域名时`,
  domain: (v) => `访问 ${v} 时`,
  domain_keyword: (v) => `访问域名包含「${v}」的网站时`,
  ip_cidr: (v) => `目标 IP 在 ${v} 网段内时`,
  source_ip_cidr: (v) => `来自 ${v} 网段的设备连接时`,
  port: (v) => `连接目标端口 ${v} 时`,
  port_range: (v) => `连接目标端口 ${v} 时`,
  protocol: (v) => `连接使用 ${v} 协议时`,
  process_name: (v) => `应用 ${v} 发起连接时`,
  process_path: (v) => `路径为 ${v} 的应用发起连接时`,
}

const TARGET_SENTENCE: Record<string, string> = {
  proxy: '走代理',
  direct: '直接连接',
  reject: '阻止连接',
}

// 值为空时不显示效果描述
export function rulePlainPreview(field: string, value: string, target: string): string | null {
  const trimmed = (value || '').trim()
  if (!trimmed) return null
  const describe = FIELD_SENTENCE[field]
  const targetText = TARGET_SENTENCE[target] || `使用节点「${target}」`
  if (!describe) return null
  return `${describe(trimmed)}，${targetText}。`
}

// 落盘 JSON 预览：与 config.yaml 的 custom_rules 条目同构
// （与后端 handlers/rules.rs build_rule_json 一致：仅 port 转数字）
export function ruleJsonPreview(field: string, value: string, target: string): string | null {
  const trimmed = (value || '').trim()
  if (!trimmed) return null
  const jsonValue = field === 'port' && /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed
  const rule =
    target === 'reject'
      ? { [field]: jsonValue, action: 'reject' }
      : { [field]: jsonValue, action: 'route', outbound: target }
  return JSON.stringify(rule)
}
