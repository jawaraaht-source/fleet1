import { useDroppable } from '@dnd-kit/core'
import AssignedCard from './AssignedCard.jsx'

function shiftHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em - sh * 60 - sm) / 60
}

export default function TeamMemberLane({ member, workOrders, onUnassign, onStatusChange, onEditWorkOrder, onEditMember, onOpenTechnician, dragSkills }) {
  const { setNodeRef, isOver } = useDroppable({ id: `member-${member.id}` })

  const capacity = shiftHours(member.shift_start, member.shift_end)
  const pct = capacity > 0 ? Math.min((member.assigned_hours / capacity) * 100, 100) : 0
  const barColor = pct < 80 ? '#38A169' : pct < 100 ? '#D69E2E' : '#E53E3E'

  const skillMatch = dragSkills?.length
    ? dragSkills.every(s => member.skills.includes(s))
    : null

  return (
    <div
      ref={setNodeRef}
      className={`team-lane ${isOver ? 'lane-over' : ''} ${skillMatch === true ? 'lane-match' : ''} ${skillMatch === false ? 'lane-mismatch' : ''} ${!member.available ? 'lane-unavailable' : ''}`}
    >
      <div className="lane-header" style={{ cursor: 'pointer' }} onClick={() => onOpenTechnician?.(member)}>
        <div className="member-avatar" style={{ background: member.avatar_color }}>
          {member.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="member-info">
          <div className="member-name">{member.name}</div>
          <div className="member-role">{member.role}</div>
        </div>
        <button className="btn-ghost btn-sm" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onEditMember(member) }}>Edit</button>
      </div>

      <div className="lane-capacity">
        <div className="capacity-bar">
          <div className="capacity-fill" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <span className="capacity-label">{member.assigned_hours}h / {capacity}h</span>
      </div>

      <div className="lane-cards">
        {workOrders.length === 0 && (
          <div className="lane-empty">Drop work orders here</div>
        )}
        {workOrders.map(wo => (
          <AssignedCard
            key={wo.id}
            wo={wo}
            onUnassign={onUnassign}
            onStatusChange={onStatusChange}
            onEdit={onEditWorkOrder}
          />
        ))}
      </div>
    </div>
  )
}
