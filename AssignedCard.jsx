import PriorityBadge from './PriorityBadge.jsx'
import StatusBadge from './StatusBadge.jsx'
import SkillTag from './SkillTag.jsx'

const STATUS_CYCLE = { 'in-progress': 'completed', 'completed': 'in-progress' }

export default function AssignedCard({ wo, onUnassign, onStatusChange, onEdit }) {
  const cycleStatus = () => {
    const next = STATUS_CYCLE[wo.status] || 'in-progress'
    onStatusChange(wo.id, next)
  }

  return (
    <div className={`assigned-card priority-${wo.priority}`}>
      <div className="card-header">
        <PriorityBadge priority={wo.priority} />
        <StatusBadge status={wo.status} onClick={cycleStatus} />
        <span className="card-hours">{wo.estimated_hours}h</span>
      </div>
      <div className="card-title">{wo.title}</div>
      {wo.location && <div className="card-location">📍 {wo.location}</div>}
      {wo.required_skills.length > 0 && (
        <div className="card-skills">
          {wo.required_skills.map(s => <SkillTag key={s} skill={s} />)}
        </div>
      )}
      <div className="card-actions">
        <button className="btn-ghost btn-sm" onClick={() => onEdit(wo)}>Edit</button>
        <button className="btn-ghost btn-sm btn-danger" onClick={() => onUnassign(wo.id)}>Unassign</button>
      </div>
    </div>
  )
}
