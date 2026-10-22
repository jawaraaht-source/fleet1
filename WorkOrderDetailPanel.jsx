import { useState } from 'react'
import PriorityBadge from './PriorityBadge.jsx'

const VENDORS = ['In-house', 'FleetPro', 'Goodyear', 'AutoZone Pro', 'Speedco']

function getCategory(skills) {
  if (!skills?.length) return 'General Maintenance'
  if (skills.some(s => ['Diesel', 'Gas'].includes(s))) return 'Powertrain'
  if (skills.includes('Electrical')) return 'Electrical'
  if (skills.includes('HVAC')) return 'HVAC / Climate'
  if (skills.some(s => ['Tires', 'Brakes'].includes(s))) return 'Chassis / Safety'
  if (skills.includes('Hydraulics')) return 'Hydraulics'
  if (skills.includes('Welding')) return 'Bodywork'
  return 'General Maintenance'
}

function getDueDateDefault(priority) {
  if (priority === 'critical' || priority === 'high') {
    return new Date().toISOString().split('T')[0]
  }
  return ''
}

// Deterministic "live" telematics values seeded by WO id
function mockOdometer(id) {
  return (70000 + ((id * 1234) % 29000)).toLocaleString()
}
function mockEngineHours(id) {
  return (1500 + ((id * 567) % 2300)).toLocaleString()
}

export default function WorkOrderDetailPanel({ wo, assignments = {}, onClose, onAssignClick }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    title: wo.title || '',
    priority: wo.priority || 'medium',
    estimated_hours: wo.estimated_hours || 1.0,
    location: wo.location || '',
    vendor: 'In-house',
    po_number: '',
    description: wo.description || '',
    due_date: getDueDateDefault(wo.priority),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const assignment = assignments[wo.id]

  const skills   = wo.required_skills || []
  const category = getCategory(skills)
  const seed     = typeof wo.id === 'number' ? wo.id : 1
  const odo      = mockOdometer(seed)
  const engHours = mockEngineHours(seed)

  const priorityColor = {
    critical: '#E53E3E', high: '#DD6B20', medium: '#D69E2E', low: '#38A169',
  }[wo.priority] || 'var(--border-2)'

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div
        className="detail-panel"
        style={{ borderTop: `3px solid ${priorityColor}` }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="detail-header">
          <div className="detail-header-left">
            <PriorityBadge priority={wo.priority} />
            <span className="wdp-open-chip">Open</span>
          </div>
          <div className="detail-header-right">
            {!editing && (
              <button className="btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="detail-scroll">

          {/* Title */}
          {editing
            ? <input
                className="detail-title-input"
                value={form.title}
                onChange={e => set('title', e.target.value)}
              />
            : <h2 className="detail-title">{form.title}</h2>
          }

          {/* ── Section 1 — Asset Details ── */}
          {wo.asset_name && (
            <div className="detail-section">
              <div className="detail-section-title">Asset Details</div>
              <div className="wdp-asset-card">
                <div className="wdp-asset-name">🚗 {wo.asset_name}</div>
                <div className="wdp-telematics-row">
                  <div className="wdp-telematic">
                    <div className="wdp-telematic-label">Odometer</div>
                    <div className="wdp-telematic-value">{odo} mi</div>
                    <div className="wdp-telematic-source">From Samsara · updated 4 min ago</div>
                  </div>
                  <div className="wdp-telematic">
                    <div className="wdp-telematic-label">Engine Hours</div>
                    <div className="wdp-telematic-value">{engHours} h</div>
                    <div className="wdp-telematic-source">From Samsara · updated 4 min ago</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Section 2 — WO Details ── */}
          <div className="detail-section">
            <div className="detail-section-title">Work Order Details</div>

            {editing ? (
              <div className="detail-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
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
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={e => set('due_date', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    value={form.location}
                    onChange={e => set('location', e.target.value)}
                    placeholder="Bay, lot, building…"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vendor</label>
                    <select value={form.vendor} onChange={e => set('vendor', e.target.value)}>
                      {VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>PO Number</label>
                    <input
                      value={form.po_number}
                      onChange={e => set('po_number', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="wdp-facts-grid">
                <div className="wdp-fact">
                  <div className="wdp-fact-label">Category</div>
                  <div className="wdp-fact-value">{category}</div>
                </div>
                <div className="wdp-fact">
                  <div className="wdp-fact-label">Est. Hours</div>
                  <div className="wdp-fact-value">{form.estimated_hours}h</div>
                </div>
                <div className="wdp-fact">
                  <div className="wdp-fact-label">Due Date</div>
                  <div
                    className="wdp-fact-value"
                    style={{ color: form.due_date ? '#E53E3E' : 'var(--text-3)', fontWeight: form.due_date ? 600 : 400 }}
                  >
                    {form.due_date || '—'}
                  </div>
                </div>
                <div className="wdp-fact">
                  <div className="wdp-fact-label">Assigned To</div>
                  {assignment
                    ? <div className="wdp-fact-value" style={{ color: '#38A169', fontWeight: 600 }}>✓ {assignment.memberName}</div>
                    : <div className="wdp-fact-value" style={{ color: '#D69E2E', fontWeight: 600 }}>Unassigned</div>
                  }
                </div>
                {form.location && (
                  <div className="wdp-fact">
                    <div className="wdp-fact-label">Location</div>
                    <div className="wdp-fact-value">📍 {form.location}</div>
                  </div>
                )}
                <div className="wdp-fact">
                  <div className="wdp-fact-label">Vendor</div>
                  <div className="wdp-fact-value">{form.vendor}</div>
                </div>
                {form.po_number && (
                  <div className="wdp-fact">
                    <div className="wdp-fact-label">PO Number</div>
                    <div className="wdp-fact-value" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {form.po_number}
                    </div>
                  </div>
                )}
                {form.description && (
                  <div className="wdp-fact wdp-fact--full">
                    <div className="wdp-fact-label">Description</div>
                    <div className="wdp-fact-value wdp-fact-desc">{form.description}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Section 3 — Required Skills ── */}
          {skills.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">Required Skills</div>
              <div className="detail-skills">
                {skills.map(s => (
                  <span key={s} className="skill-tag">{s}</span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="detail-footer">
          {editing ? (
            <>
              <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="btn-primary btn-sm" onClick={() => setEditing(false)}>Save</button>
              </div>
            </>
          ) : (
            <>
              <button className="btn-ghost btn-sm" onClick={onClose}>Close</button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="btn-primary btn-sm" onClick={onAssignClick}>
                  Assign →
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
