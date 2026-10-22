import { useState } from 'react'
import { PRIORITIES, SKILLS } from '../constants.js'
import { formatRelativeDateTime } from '../utils/dateFormat.js'
import { buildAutoForm, buildInstructions } from '../utils/woAutoFill.jsx'

const SOURCE_LABELS = { dvir: 'DVIR Defect', fault_code: 'Fault Code', pm: 'PM Schedule' }

function SourceStrip({ sourceType, item }) {
  if (sourceType === 'dvir') {
    return (
      <div className="preview-source-strip">
        <strong>Reported by {item.reported_by || 'Driver'}</strong>
        {' — '}
        {formatRelativeDateTime(item.reported_at)}
        {item.asset_name && <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>· {item.asset_name}</span>}
        <div style={{ marginTop: 4, color: 'var(--text-1)' }}>{item.description}</div>
      </div>
    )
  }
  if (sourceType === 'fault_code') {
    return (
      <div className="preview-source-strip">
        <strong style={{ fontFamily: 'monospace' }}>[{item.code}]</strong>
        {' detected '}
        {formatRelativeDateTime(item.detected_at)}
        {item.asset_name && <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>on {item.asset_name}</span>}
        <div style={{ marginTop: 4, color: 'var(--text-1)' }}>{item.description}</div>
      </div>
    )
  }
  return (
    <div className="preview-source-strip">
      <strong>{item.title}</strong>
      {' — due '}
      {formatRelativeDateTime(item.next_due)}
      {', last done '}
      <span>{item.last_completed ? formatRelativeDateTime(item.last_completed) : 'Never'}</span>
    </div>
  )
}

export default function WorkOrderPreviewModal({ sourceType, sourceItem, onConfirm, onClose }) {
  const [form,      setForm]      = useState(() => buildAutoForm(sourceType, sourceItem))
  const [rewriting, setRewriting] = useState(false)
  const [rewriteN,  setRewriteN]  = useState(1)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleSkill = (skill) => {
    set('required_skills', form.required_skills.includes(skill)
      ? form.required_skills.filter(s => s !== skill)
      : [...form.required_skills, skill])
  }

  const handleRewrite = () => {
    if (rewriting) return
    setRewriting(true)
    setTimeout(() => {
      setForm(f => ({ ...f, notes: buildInstructions(sourceType, sourceItem, rewriteN) }))
      setRewriteN(n => n + 1)
      setRewriting(false)
    }, 480)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm({ ...form, estimated_hours: parseFloat(form.estimated_hours) || 1.0 })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--preview" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            Create Work Order
            <span className="preview-source-badge">{SOURCE_LABELS[sourceType]}</span>
          </h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <SourceStrip sourceType={sourceType} item={sourceItem} />

        <form id="preview-form" onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Title *</label>
            <input
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Work order title"
            />
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
              <input
                type="number" min="0.25" max="12" step="0.25"
                value={form.estimated_hours}
                onChange={e => set('estimated_hours', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                value={form.scheduled_start}
                onChange={e => set('scheduled_start', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Bay, vehicle, location..."
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Details, symptoms, context..."
            />
          </div>

          <div className="form-group">
            <label>Required Skills</label>
            <div className="skill-picker">
              {SKILLS.map(s => (
                <button
                  key={s} type="button"
                  className={`skill-option ${form.required_skills.includes(s) ? 'selected' : ''}`}
                  onClick={() => toggleSkill(s)}
                >{s}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Technician Instructions</label>
            <textarea
              className={rewriting ? 'notes-rewriting' : ''}
              rows={8}
              value={rewriting ? '↺  Generating new instructions…' : form.notes}
              onChange={e => !rewriting && set('notes', e.target.value)}
              placeholder="Step-by-step instructions for the technician..."
              style={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6 }}
            />
            <button
              type="button"
              className="btn-rewrite"
              onClick={handleRewrite}
              disabled={rewriting}
            >
              {rewriting
                ? <><span className="rewrite-spinner" />Rewriting…</>
                : '↺ Rewrite Instructions'
              }
            </button>
          </div>

        </form>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="preview-form" className="btn-primary">Create Work Order</button>
        </div>
      </div>
    </div>
  )
}
