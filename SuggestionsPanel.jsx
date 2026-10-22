import { useState } from 'react'
import { getSuggestions } from '../utils/suggest.js'
import PriorityBadge from './PriorityBadge.jsx'

export default function SuggestionsPanel({ workOrders, team, onAssign, onClose }) {
  const suggestions = getSuggestions(workOrders, team)
  const [applied, setApplied] = useState(new Set())

  const handleAssign = async (wo, assignee) => {
    await onAssign(wo.id, assignee.id)
    setApplied(prev => new Set(prev).add(wo.id))
  }

  const handleApplyAll = async () => {
    for (const { wo, assignee } of suggestions) {
      if (assignee && !applied.has(wo.id)) {
        await handleAssign(wo, assignee)
      }
    }
  }

  const assignable = suggestions.filter(s => s.assignee && !applied.has(s.wo.id))

  return (
    <div className="suggestions-overlay" onClick={onClose}>
      <div className="suggestions-panel" onClick={e => e.stopPropagation()}>
        <div className="suggestions-header">
          <div>
            <h2>Assignment Suggestions</h2>
            <p className="suggestions-subtitle">Ranked by business risk and impact</p>
          </div>
          <div className="suggestions-header-actions">
            {assignable.length > 0 && (
              <button className="btn-primary" onClick={handleApplyAll}>
                Apply All ({assignable.length})
              </button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            All work orders are already assigned!
          </div>
        ) : (
          <div className="suggestions-list">
            {suggestions.map(({ wo, score, reasons, assignee }, i) => {
              const isApplied = applied.has(wo.id)
              return (
                <div key={wo.id} className={`suggestion-item ${isApplied ? 'suggestion-applied' : ''}`}>
                  <div className="suggestion-rank">
                    {isApplied ? '✓' : `#${i + 1}`}
                  </div>
                  <div className="suggestion-body">
                    <div className="suggestion-title-row">
                      <PriorityBadge priority={wo.priority} />
                      <span className="suggestion-title">{wo.title}</span>
                      <span className="suggestion-hours">{wo.estimated_hours}h</span>
                    </div>
                    {wo.location && <div className="suggestion-location">📍 {wo.location}</div>}
                    <ul className="suggestion-reasons">
                      {reasons.length > 0
                        ? reasons.map((r, j) => <li key={j}>{r}</li>)
                        : <li>Assign by priority level</li>
                      }
                    </ul>
                    <div className="suggestion-assignee-row">
                      {assignee ? (
                        <>
                          <div className="assignee-chip">
                            <span className="assignee-dot" style={{ background: assignee.avatar_color }} />
                            <span>Best match: <strong>{assignee.name}</strong></span>
                            <span className="assignee-load">({assignee.assigned_hours}h assigned)</span>
                          </div>
                          {!isApplied && (
                            <button className="btn-assign" onClick={() => handleAssign(wo, assignee)}>
                              Assign →
                            </button>
                          )}
                          {isApplied && <span className="applied-label">Assigned</span>}
                        </>
                      ) : (
                        <span className="no-match">No available team member with required skills</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
