import { useState } from 'react'
import { SEVERITY_LEVELS } from '../constants.js'

export default function DVIRModal({ assets, onSave, onClose }) {
  const [form, setForm] = useState({ asset_id: '', description: '', severity: 'medium', reported_by: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Report DVIR Defect</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>Simulate a driver vehicle inspection report</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form id="dvir-form" className="modal-form" onSubmit={e => { e.preventDefault(); onSave(form) }}>
          <div className="form-group">
            <label>Vehicle</label>
            <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)}>
              <option value="">Select vehicle...</option>
              {assets.filter(a => a.asset_type === 'vehicle' || a.asset_type === 'trailer').map(a => (
                <option key={a.id} value={a.id}>{a.name} {a.identifier ? `(${a.identifier})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Defect Description *</label>
            <textarea required rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe what the driver found (e.g. 'Left rear brake light out', 'Check engine light on')..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)}>
                {SEVERITY_LEVELS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Reported By</label>
              <input value={form.reported_by} onChange={e => set('reported_by', e.target.value)} placeholder="Driver name..." />
            </div>
          </div>
        </form>
        <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" form="dvir-form" className="btn-primary">Submit Report</button>
          </div>
      </div>
    </div>
  )
}
