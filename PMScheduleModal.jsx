import { useState, useEffect } from 'react'
import { SKILLS } from '../constants.js'

const EMPTY = { asset_id: '', title: '', description: '', frequency_days: 90, required_skills: [], estimated_hours: 1.0, next_due: '' }

export default function PMScheduleModal({ pm, assets, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    setForm(pm ? {
      asset_id: pm.asset_id || '', title: pm.title, description: pm.description,
      frequency_days: pm.frequency_days, required_skills: pm.required_skills,
      estimated_hours: pm.estimated_hours, next_due: pm.next_due
    } : { ...EMPTY, next_due: new Date().toISOString().split('T')[0] })
  }, [pm])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleSkill = (skill) => set('required_skills',
    form.required_skills.includes(skill)
      ? form.required_skills.filter(s => s !== skill)
      : [...form.required_skills, skill]
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{pm ? 'Edit PM Schedule' : 'New PM Schedule'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form id="pm-form" className="modal-form" onSubmit={e => { e.preventDefault(); onSave({ ...form, asset_id: form.asset_id || null, estimated_hours: parseFloat(form.estimated_hours), frequency_days: parseInt(form.frequency_days) }) }}>
          <div className="form-group">
            <label>Asset</label>
            <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)}>
              <option value="">No specific asset</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} {a.identifier ? `(${a.identifier})` : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Service Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Oil & Filter Change, DOT Inspection..." />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What work is involved?" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Frequency (days)</label>
              <input type="number" min="1" value={form.frequency_days} onChange={e => set('frequency_days', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Est. Hours</label>
              <input type="number" min="0.25" max="24" step="0.25" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Next Due *</label>
              <input type="date" required value={form.next_due} onChange={e => set('next_due', e.target.value)} />
            </div>
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
        </form>
        <div className="modal-actions">
            {pm && <button type="button" className="btn-danger" onClick={() => onDelete(pm.id)}>Delete</button>}
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" form="pm-form" className="btn-primary">Save</button>
          </div>
      </div>
    </div>
  )
}
