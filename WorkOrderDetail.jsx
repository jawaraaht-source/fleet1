import { useState, useEffect, useRef } from 'react'
import { PRIORITIES, SKILLS, SOURCE_TYPES, getSourceType } from '../constants.js'
import PriorityBadge from './PriorityBadge.jsx'
import StatusBadge from './StatusBadge.jsx'
import { getRecommendedAssignee } from '../utils/suggest.js'
import * as api from '../api.js'

function formatTs(ts) {
  const d = new Date(ts)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function WorkOrderDetail({ wo: initialWO, team, assets, onClose, onSaved, onDeleted, onAssign }) {
  const [wo, setWO] = useState(initialWO)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [newPart, setNewPart] = useState('')
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const noteRef = useRef(null)

  useEffect(() => {
    setWO(initialWO)
    setEditing(false)
    setForm({
      title: initialWO.title,
      description: initialWO.description,
      location: initialWO.location,
      priority: initialWO.priority,
      estimated_hours: initialWO.estimated_hours,
      scheduled_start: initialWO.scheduled_start || '',
      notes: initialWO.notes || '',
      asset_id: initialWO.asset_id || '',
      required_skills: initialWO.required_skills || [],
      parts_needed: initialWO.parts_needed || [],
    })
  }, [initialWO])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleSkill = (skill) => set('required_skills',
    form.required_skills.includes(skill)
      ? form.required_skills.filter(s => s !== skill)
      : [...form.required_skills, skill]
  )

  const addPart = () => {
    if (!newPart.trim()) return
    set('parts_needed', [...form.parts_needed, newPart.trim()])
    setNewPart('')
  }

  const removePart = (i) => set('parts_needed', form.parts_needed.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.updateWorkOrder(wo.id, {
        ...form,
        asset_id: form.asset_id || null,
        estimated_hours: parseFloat(form.estimated_hours) || 1.0,
        scheduled_start: form.scheduled_start || null,
      })
      setWO(updated)
      setEditing(false)
      onSaved?.(updated)
    } finally { setSaving(false) }
  }

  const handleAppendNote = async () => {
    if (!newNote.trim()) return
    const updated = await api.appendNote(wo.id, newNote.trim())
    setWO(updated)
    setNewNote('')
    onSaved?.(updated)
  }

  const handleDelete = async () => {
    await api.deleteWorkOrder(wo.id)
    onDeleted?.(wo.id)
    onClose()
  }

  const recommended = getRecommendedAssignee(wo, team)
  const src = getSourceType(wo.source_type)
  const asset = assets.find(a => a.id === wo.asset_id)

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-left">
            <PriorityBadge priority={wo.priority} />
            <StatusBadge status={wo.status} />
            {wo.is_candidate && <span className="candidate-badge">Pending Confirmation</span>}
          </div>
          <div className="detail-header-right">
            {!editing && <button className="btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="detail-scroll">
          {/* Title */}
          {editing
            ? <input className="detail-title-input" value={form.title} onChange={e => set('title', e.target.value)} />
            : <h2 className="detail-title">{wo.title}</h2>
          }

          {/* Source */}
          <div className="detail-source">
            <span style={{ color: src.color, fontWeight: 600 }}>{src.label}</span>
            {wo.asset_name && <span className="detail-asset">· 🚗 {wo.asset_name}</span>}
            {wo.location && <span className="detail-loc">· 📍 {wo.location}</span>}
          </div>

          {/* Asset (editing) */}
          {editing && (
            <div className="detail-section">
              <div className="detail-section-title">Vehicle / Asset</div>
              <select className="detail-select" value={form.asset_id} onChange={e => set('asset_id', e.target.value)}>
                <option value="">No asset</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name} {a.identifier ? `(${a.identifier})` : ''}</option>)}
              </select>
              {asset && !editing && (
                <div className="asset-info-card">
                  <span>{asset.year} {asset.make} {asset.model}</span>
                  <span className="asset-id">{asset.identifier}</span>
                </div>
              )}
            </div>
          )}

          {/* Asset card (viewing) */}
          {!editing && asset && (
            <div className="asset-info-card">
              <span className="asset-info-label">🚗 {asset.name}</span>
              <span>{asset.year} {asset.make} {asset.model}</span>
              {asset.identifier && <span className="asset-id">{asset.identifier}</span>}
            </div>
          )}

          {/* Details */}
          <div className="detail-section">
            <div className="detail-section-title">Details</div>
            {editing ? (
              <div className="detail-form">
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
                <div className="form-group">
                  <label>Location</label>
                  <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Bay, lot, building..." />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
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
              </div>
            ) : (
              <div className="detail-facts">
                <div className="fact"><span>Hours</span><strong>{wo.estimated_hours}h</strong></div>
                {wo.scheduled_start && <div className="fact"><span>Start</span><strong>{wo.scheduled_start}</strong></div>}
                {wo.description && <p className="detail-desc">{wo.description}</p>}
                {wo.required_skills?.length > 0 && (
                  <div className="detail-skills">
                    {wo.required_skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Parts Needed */}
          <div className="detail-section">
            <div className="detail-section-title">Parts Needed</div>
            <div className="parts-tags">
              {(editing ? form.parts_needed : wo.parts_needed || []).map((p, i) => (
                <span key={i} className="part-tag">
                  {p}
                  {editing && <button onClick={() => removePart(i)}>×</button>}
                </span>
              ))}
              {(editing ? form.parts_needed : wo.parts_needed || []).length === 0 && (
                <span className="no-parts">No parts listed</span>
              )}
            </div>
            {editing && (
              <div className="parts-input-row">
                <input
                  placeholder="Add a part..."
                  value={newPart}
                  onChange={e => setNewPart(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPart()}
                />
                <button className="btn-ghost btn-sm" onClick={addPart}>Add</button>
              </div>
            )}
          </div>

          {/* Assignment */}
          <div className="detail-section">
            <div className="detail-section-title">Assignment</div>
            {wo.assigned_to_name
              ? <div className="detail-assigned">
                  <span className="assignee-name">👤 {wo.assigned_to_name}</span>
                  <StatusBadge status={wo.status} />
                </div>
              : <div className="detail-unassigned">
                  Unassigned
                  {recommended && (
                    <div className="recommendation-chip">
                      <span>Recommended: <strong>{recommended.name}</strong></span>
                      <button className="btn-assign" onClick={() => onAssign(wo.id, recommended.id)}>
                        Assign →
                      </button>
                    </div>
                  )}
                </div>
            }
            {!wo.assigned_to && !recommended && (
              <div className="no-match">No available technician with required skills</div>
            )}
          </div>

          {/* Notes Log */}
          <div className="detail-section">
            <div className="detail-section-title">Notes Log</div>
            <div className="notes-log">
              {wo.notes_log?.length === 0 && <div className="no-notes">No notes yet</div>}
              {wo.notes_log?.map((n, i) => (
                <div key={i} className="note-entry">
                  <div className="note-meta">{n.author} · {formatTs(n.ts)}</div>
                  <div className="note-text">{n.text}</div>
                </div>
              ))}
            </div>
            <div className="note-input-row">
              <textarea
                ref={noteRef}
                rows={2}
                placeholder="Add a note..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
              />
              <button className="btn-ghost btn-sm" onClick={handleAppendNote}>Post</button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="detail-footer">
          {!confirmDelete
            ? <button className="btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>Delete</button>
            : <>
                <span style={{ fontSize: '0.8rem', color: '#E53E3E' }}>Delete this work order?</span>
                <button className="btn-danger btn-sm" onClick={handleDelete}>Confirm</button>
                <button className="btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </>
          }
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {editing && <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>}
            {editing && <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>}
          </div>
        </div>

      </div>
    </div>
  )
}
