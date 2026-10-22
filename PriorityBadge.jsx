import { getPriority } from '../constants.js'

export default function PriorityBadge({ priority }) {
  const p = getPriority(priority)
  return (
    <span className="badge" style={{ color: p.color, background: p.bg, border: `1px solid ${p.color}40` }}>
      {p.label}
    </span>
  )
}
