import { useState, useEffect } from 'react'
import { SKILLS, AVATAR_COLORS } from '../constants.js'

const EMPTY = {
  name: '', role: '', skills: [], shift_start: '08:00', shift_end: '17:00',
  avatar_color: '#4ECDC4', available: true
}

export default function TeamMemberModal({ member, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    setForm(member ? {
      name: member.name, role: member.role, skills: member.skills,
      shift_start: member.shift_start, shift_end: member.shift_end,
      avatar_color: member.avatar_color, available: member.available
    } : { ...EMPTY })
  }, [member])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleSkill = (skill) => {
    set('skills', form.skills.includes(skill)
      ? form.skills.filter(s => s !== skill)
      : [...form.skills, skill])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{member ? 'Edit Team Member' : 'New Team Member'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form id="member-form" onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Role / Trade *</label>
              <input required value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. HVAC Technician" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Shift Start</label>
              <input type="time" value={form.shift_start} onChange={e => set('shift_start', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Shift End</label>
              <input type="time" value={form.shift_end} onChange={e => set('shift_end', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Available</label>
              <label className="toggle">
                <input type="checkbox" checked={form.available} onChange={e => set('available', e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Avatar Color</label>
            <div className="color-picker">
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button"
                  className={`color-swatch ${form.avatar_color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => set('avatar_color', c)}
                />
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Skills</label>
            <div className="skill-picker">
              {SKILLS.map(s => (
                <button key={s} type="button"
                  className={`skill-option ${form.skills.includes(s) ? 'selected' : ''}`}
                  onClick={() => toggleSkill(s)}>{s}</button>
              ))}
            </div>
          </div>
        </form>
        <div className="modal-actions">
            {member && <button type="button" className="btn-danger" onClick={() => onDelete(member.id)}>Remove</button>}
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" form="member-form" className="btn-primary">Save</button>
          </div>
      </div>
    </div>
  )
}
