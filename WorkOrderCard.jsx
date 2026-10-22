import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import PriorityBadge from './PriorityBadge.jsx'
import SkillTag from './SkillTag.jsx'

export default function WorkOrderCard({ wo, onEdit, memberSkills, compact }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `wo-${wo.id}`,
    data: { workOrderId: wo.id }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`work-order-card ${isDragging ? 'dragging' : ''} priority-${wo.priority}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-header">
        <PriorityBadge priority={wo.priority} />
        <span className="card-hours">{wo.estimated_hours}h</span>
      </div>
      <div className="card-title">{wo.title}</div>
      {wo.location && <div className="card-location">📍 {wo.location}</div>}
      {!compact && wo.required_skills.length > 0 && (
        <div className="card-skills">
          {wo.required_skills.map(s => (
            <SkillTag key={s} skill={s} highlight={memberSkills?.includes(s)} />
          ))}
        </div>
      )}
      <button className="card-edit-btn" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onEdit(wo) }}>
        Edit
      </button>
    </div>
  )
}
