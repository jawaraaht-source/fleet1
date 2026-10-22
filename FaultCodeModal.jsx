import { useState } from 'react'
import { SEVERITY_LEVELS } from '../constants.js'

export default function FaultCodeModal({ assets, onSave, onClose }) {
  const [form, setForm] = useState({ asset_id: '', code: '', description: '', severity: 'high' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Log Fault Code</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>Log a diagnostic fault code from a vehicle or equipment</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form id="fault-form" className="modal-form" onSubmit={e => { e.preventDefault(); onSave(form) }}>
          <div className="form-group">
            <label>Asset</label>
            <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)}>
              <option value="">Select asset...</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} {a.identifier ? `(${a.identifier})` : ''}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 0.8 }}>
              <label>Fault Code *</label>
              <input required value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="P0300, DTC-4521..." />
            </div>
            <div className="form-group">
              <label>Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)}>
                {SEVERITY_LEVELS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description *</label>
            <textarea required rows={2} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="What does this fault code mean? (e.g. 'Random/Multiple Cylinder Misfire Detected')..." />
          </div>
        </form>
        <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" form="fault-form" className="btn-primary">Log Fault Code</button>
          </div>
      </div>
    </div>
  )
}
