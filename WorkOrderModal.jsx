import { useState, useEffect } from 'react'
import { PRIORITIES, SKILLS } from '../constants.js'

const EMPTY = {
  title: '', description: '', location: '', priority: 'medium',
  required_skills: [], estimated_hours: 1.0, scheduled_start: '', notes: '',
  asset_id: null,
}

export default function WorkOrderModal({ wo, assets = [], onSave, onDelete, onClose, planDate }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    setForm(wo ? {
      title: wo.title, description: wo.description, location: wo.location,
      priority: wo.priority, required_skills: wo.required_skills,
      estimated_hours: wo.estimated_hours, scheduled_start: wo.scheduled_start || '',
      notes: wo.notes || '', asset_id: wo.asset_id || null,
    } : { ...EMPTY })
  }, [wo])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleSkill = (skill) => {
    set('required_skills', form.required_skills.includes(skill)
      ? form.required_skills.filter(s => s !== skill)
      : [...form.required_skills, skill])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, estimated_hours: parseFloat(form.estimated_hours) || 1.0 })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{wo ? 'Edit Work Order' : 'New Work Order'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form id="wo-form" onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs to be done?" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Est. Hours</label>
              <input type="number" min="0.25" max="12" step="0.25" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" value={form.scheduled_start} onChange={e => set('scheduled_start', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Asset / Vehicle</label>
              <select value={form.asset_id ?? ''} onChange={e => set('asset_id', e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">— None —</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.name}{a.identifier ? ` (${a.identifier})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Bay, building, area..." />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Details, symptoms, context..." />
          </div>
          <div className="form-group">
            <label>Required Skills</label>
            <div className="skill-picker">
              {SKILLS.map(s => (
                <button key={s} type="button"
                  className={`skill-option ${form.required_skills.includes(s) ? 'selected' : ''}`}
                  onClick={() => toggleSkill(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." />
          </div>
        </form>
        <div className="modal-actions">
            {wo && <button type="button" className="btn-danger" onClick={() => onDelete(wo.id)}>Delete</button>}
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" form="wo-form" className="btn-primary">Save</button>
          </div>
      </div>
    </div>
  )
}
