import { useState } from 'react'
import PriorityBadge from './PriorityBadge.jsx'
import StatusBadge from './StatusBadge.jsx'
import SkillTag from './SkillTag.jsx'
import * as api from '../api.js'

function shiftHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em - sh * 60 - sm) / 60
}

export default function TechnicianView({ member, workOrders, team, onClose, onStatusChange, onReassign, onOpenDetail }) {
  const [reassigning, setReassigning] = useState(null)
  const [saving, setSaving] = useState(false)

  const capacity = shiftHours(member.shift_start, member.shift_end)
  const pct = capacity > 0 ? Math.min((member.assigned_hours / capacity) * 100, 100) : 0
  const barColor = pct < 80 ? '#38A169' : pct < 100 ? '#D69E2E' : '#E53E3E'

  const myWOs = workOrders.filter(wo => wo.assigned_to === member.id)
  const completed = myWOs.filter(w => w.status === 'completed').length

  const handleReassign = async (woId, newMemberId) => {
    setSaving(true)
    try {
      await api.assignWorkOrder(woId, newMemberId || null)
      onReassign?.()
      setReassigning(null)
    } finally { setSaving(false) }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>

        <div className="detail-header">
          <div className="member-avatar" style={{ background: member.avatar_color }}>
            {member.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="tech-header-info">
            <div className="member-name" style={{ fontSize: '1.05rem' }}>{member.name}</div>
            <div className="member-role">{member.role}</div>
            <div className="tech-shift">{member.shift_start} – {member.shift_end}</div>
          </div>
          <div className="detail-header-right">
            <span className={`avail-badge ${member.available ? 'avail' : 'unavail'}`}>
              {member.available ? 'Available' : 'Unavailable'}
            </span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="detail-scroll">
          {/* Capacity */}
          <div className="tech-capacity-section">
            <div className="tech-capacity-bar">
              <div className="capacity-fill" style={{ width: `${pct}%`, background: barColor }} />
            </div>
            <div className="tech-capacity-stats">
              <span>{member.assigned_hours}h assigned / {capacity}h shift</span>
              <span>{completed} of {myWOs.length} done</span>
            </div>
          </div>

          {/* Skills */}
          <div className="detail-section">
            <div className="detail-section-title">Certifications & Skills</div>
            <div className="detail-skills">
              {member.skills.map(s => <SkillTag key={s} skill={s} />)}
              {member.skills.length === 0 && <span className="no-parts">No skills listed</span>}
            </div>
          </div>

          {/* Work Orders */}
          <div className="detail-section">
            <div className="detail-section-title">Today's Work Orders ({myWOs.length})</div>
            {myWOs.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>No work orders assigned today</div>
            ) : (
              <div className="tech-wo-list">
                {myWOs.map(wo => (
                  <div key={wo.id} className={`tech-wo-item priority-${wo.priority}`}>
                    <div className="tech-wo-header">
                      <PriorityBadge priority={wo.priority} />
                      <StatusBadge status={wo.status}
                        onClick={() => {
                          const cycle = { 'in-progress': 'completed', 'completed': 'in-progress' }
                          onStatusChange?.(wo.id, cycle[wo.status] || 'in-progress')
                        }}
                      />
                      <span className="card-hours">{wo.estimated_hours}h</span>
                    </div>
                    <div className="tech-wo-title" onClick={() => onOpenDetail?.(wo)}>{wo.title}</div>
                    {wo.asset_name && <div className="card-location">🚗 {wo.asset_name}</div>}

                    {reassigning === wo.id ? (
                      <div className="reassign-row">
                        <select className="detail-select" onChange={e => handleReassign(wo.id, e.target.value)} defaultValue="">
                          <option value="">Unassign</option>
                          {team.filter(m => m.id !== member.id).map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <button className="btn-ghost btn-sm" onClick={() => setReassigning(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setReassigning(wo.id)}>
                        Reassign
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="detail-footer">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
