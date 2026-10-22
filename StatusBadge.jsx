import { getStatus, STATUSES } from '../constants.js'

export default function StatusBadge({ status, onClick }) {
  const s = getStatus(status)
  return (
    <span
      className={`badge ${onClick ? 'clickable' : ''}`}
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}40` }}
      onClick={onClick}
      title={onClick ? 'Click to change status' : undefined}
    >
      {s.label}
    </span>
  )
}
