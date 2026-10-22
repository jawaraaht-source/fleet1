import { useState } from 'react'

// ── Priority display metadata ─────────────────────────────────────────────────
const PRIORITY_META = {
  critical: { label: 'Critical', bg: '#FFF5F5', text: '#C53030', border: '#FEB2B2' },
  high:     { label: 'High',     bg: '#FFFAF0', text: '#C05621', border: '#FBD38D' },
  medium:   { label: 'Medium',   bg: '#FFFFF0', text: '#975A16', border: '#FAF089' },
  low:      { label: 'Low',      bg: '#F0FFF4', text: '#276749', border: '#9AE6B4' },
}

const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 }

const MAX_HOURS = 9

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name) {
  const parts = (name || '').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

function parseShiftHours(start, end) {
  if (!start || !end) return 8
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em - sh * 60 - sm) / 60
}

/**
 * Given a work order and the full team (plus session-committed hours),
 * return the best matching member and match metadata.
 * If the top skill-matched tech lacks capacity, skip them and note why.
 */
function findBestMatch(wo, team, sessionHours) {
  const woSkills  = wo.required_skills || []
  const woHours   = wo.estimated_hours || 1
  const available = team.filter(m => m.available !== false)
  if (!available.length) return null

  // Score every tech
  const scored = available.map(member => {
    const memberSkills = member.skills || []
    const matching  = woSkills.filter(s => memberSkills.includes(s))
    const shiftH    = parseShiftHours(member.shift_start, member.shift_end)
    const usedH     = (member.assigned_hours || 0) + (sessionHours[member.id] || 0)
    const remaining = Math.max(shiftH - usedH, 0)
    const score     = matching.length * 10 + Math.min(remaining, 8) * 0.5
    return { member, matching, remaining, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const top = scored[0]

  // If top tech has enough capacity, return them with no skippedBest
  if (top.remaining >= woHours) {
    return { member: top.member, matching: top.matching, remaining: top.remaining, skippedBest: null }
  }

  // Top tech is at capacity — find next best who CAN take the job
  const fallback = scored.slice(1).find(c => c.remaining >= woHours)

  if (fallback) {
    return {
      member:      fallback.member,
      matching:    fallback.matching,
      remaining:   fallback.remaining,
      skippedBest: { member: top.member, remaining: top.remaining },
    }
  }

  // Nobody has enough capacity — recommend whoever has the most remaining
  return {
    member:      top.member,
    matching:    top.matching,
    remaining:   top.remaining,
    skippedBest: null,
  }
}

function getSkillReason(match, wo) {
  if (!match) return 'Best available technician'
  const { matching } = match
  const woSkills = wo.required_skills || []
  if (woSkills.length === 0) return 'Most available technician'
  if (matching.length > 0 && matching.length >= woSkills.length) {
    return `Certified: ${matching.join(', ')} — exact skill match`
  }
  if (matching.length > 0) {
    return `Certified: ${matching[0]} — matches job requirements`
  }
  return 'Most available — closest match'
}

// ── CapacityBar ───────────────────────────────────────────────────────────────
export function CapacityBar({ usedHours, maxHours = MAX_HOURS }) {
  const pct   = Math.min(usedHours / maxHours, 1) * 100
  const color = pct >= 90 ? '#E53E3E' : pct >= 70 ? '#D69E2E' : '#38A169'
  return (
    <div className="capacity-bar-wrap">
      <div className="capacity-bar-track">
        <div className="capacity-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="capacity-bar-label" style={{ color }}>
        {usedHours.toFixed(1)}h / {maxHours}h
      </span>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, color, size = 40 }) {
  return (
    <div
      className="sam-avatar"
      style={{ width: size, height: size, background: color || '#718096', fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function SuggestAssignModal({
  workOrders = [],
  team = [],
  assignments = {},
  onAssign,
  onClose,
  onViewDayPlan,
}) {
  // Build the assignment queue once at mount: unassigned WOs in the order
  // they were passed in (= the supervisor's current visual order in the list).
  // Never re-sort here — manual drag-reordering must be respected.
  const [queue] = useState(() =>
    [...workOrders].filter(wo => !assignments[wo.id])
  )

  const total = queue.length

  const [currentIdx,    setCurrentIdx]    = useState(0)
  const [cardKey,       setCardKey]       = useState(0)
  const [isExiting,     setIsExiting]     = useState(false)
  const [showOther,     setShowOther]     = useState(false)
  const [done,          setDone]          = useState(false)
  // Hours committed by each tech through this modal session
  const [sessionHours,  setSessionHours]  = useState({})
  // Summary of what was actually assigned (not skipped)
  const [doneList,      setDoneList]      = useState([])

  // ── "All already assigned" edge state ────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="sam-overlay" onClick={onClose}>
        <div className="sam-modal" onClick={e => e.stopPropagation()}>
          <div className="sam-done">
            <div className="sam-done-icon" style={{ background: '#EBF8FF', borderColor: '#BEE3F8', color: '#2B6CB0' }}>
              ✓
            </div>
            <h2 className="sam-done-title">All work orders are already assigned</h2>
            <p className="sam-done-sub">Your team is ready to deploy.</p>
            <div className="sam-done-actions">
              <button className="btn-primary" onClick={() => { onClose(); onViewDayPlan?.() }}>View Day Plan</button>
              <button className="btn-ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Completion screen ─────────────────────────────────────────────────────────
  if (done) {
    const allSkipped = doneList.length === 0
    return (
      <div className="sam-overlay" onClick={onClose}>
        <div className="sam-modal" onClick={e => e.stopPropagation()}>
          <div className="sam-done">
            <div className="sam-done-icon" style={allSkipped ? { background: '#F7F8FA', borderColor: '#CBD5E0', color: '#718096' } : {}}>
              {allSkipped ? '—' : '✓'}
            </div>
            <h2 className="sam-done-title">
              {allSkipped
                ? 'No assignments made'
                : doneList.length === total
                ? 'All work orders assigned'
                : 'Assignment session complete'
              }
            </h2>
            <p className="sam-done-sub">
              {allSkipped
                ? 'All work orders were skipped.'
                : 'Your team is ready to deploy.'
              }
            </p>
            {doneList.length > 0 && (
              <ul className="sam-done-list">
                {doneList.map((a, i) => (
                  <li key={i} className="sam-done-item">
                    <span className="sam-done-rank">{i + 1}</span>
                    <span className="sam-done-job">
                      {a.title}
                      {a.asset && <span className="sam-done-asset"> · {a.asset}</span>}
                    </span>
                    <span className="sam-done-tech">→ {a.techName}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="sam-done-actions">
              <button className="btn-primary" onClick={() => { onClose(); onViewDayPlan?.() }}>View Day Plan</button>
              <button className="btn-ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Active assignment card ─────────────────────────────────────────────────────
  const wo  = queue[currentIdx]
  const pm  = PRIORITY_META[wo.priority] || PRIORITY_META.medium
  const rec = findBestMatch(wo, team, sessionHours)
  const recMember   = rec?.member
  const skillReason = rec ? getSkillReason(rec, wo) : ''

  // "Assign to someone else" list — everyone except the recommended, sorted by remaining capacity
  const otherTechs = team
    .filter(m => m.available !== false && m.id !== recMember?.id)
    .sort((a, b) => {
      const aR = parseShiftHours(a.shift_start, a.shift_end) - (a.assigned_hours || 0) - (sessionHours[a.id] || 0)
      const bR = parseShiftHours(b.shift_start, b.shift_end) - (b.assigned_hours || 0) - (sessionHours[b.id] || 0)
      return bR - aR
    })

  function advance() {
    const nextIdx = currentIdx + 1
    if (nextIdx >= total) {
      setDone(true)
    } else {
      setCurrentIdx(nextIdx)
      setCardKey(k => k + 1)
    }
    setIsExiting(false)
    setShowOther(false)
  }

  function doAssign(memberId, memberName) {
    setIsExiting(true)
    // Sync assignment back to the list immediately
    onAssign?.(wo.id, memberId, memberName)
    // Track hours committed in this session so capacity adjusts for subsequent recommendations
    if (memberId) {
      setSessionHours(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || 0) + (wo.estimated_hours || 1),
      }))
    }
    setDoneList(prev => [...prev, { title: wo.title, asset: wo.asset_name, techName: memberName }])
    setTimeout(advance, 270)
  }

  function doSkip() {
    setIsExiting(true)
    setTimeout(advance, 270)
  }

  return (
    <div className="sam-overlay" onClick={onClose}>
      <div className="sam-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header + progress ── */}
        <div className="sam-header">
          <div className="sam-header-top">
            <span className="sam-header-label">Assigning work orders</span>
            <span className="sam-header-count">{currentIdx + 1} of {total}</span>
            <button className="sam-close" onClick={onClose}>✕</button>
          </div>
          <div className="sam-progress-track">
            <div
              className="sam-progress-fill"
              style={{ width: `${(currentIdx / total) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Animating card ── */}
        <div className="sam-card-area">
          <div key={cardKey} className={`sam-card${isExiting ? ' sam-card--exiting' : ''}`}>

            {/* Work order details */}
            <div className="sam-wo-section">
              <span
                className="sam-wo-priority"
                style={{ background: pm.bg, color: pm.text, borderColor: pm.border }}
              >
                {pm.label}
              </span>
              <h3 className="sam-wo-title">{wo.title}</h3>
              <div className="sam-wo-meta">
                {wo.asset_name && <span>🚗 {wo.asset_name}</span>}
                <span>⏱ {wo.estimated_hours}h estimated</span>
              </div>
              {(wo.priority_reason || wo.computed_reasons?.[0]) && (
                <div className="sam-wo-reason">
                  → {wo.priority_reason || wo.computed_reasons[0]}
                </div>
              )}
              {wo.required_skills?.length > 0 && (
                <div className="sam-wo-skills">
                  {wo.required_skills.map(s => (
                    <span key={s} className="skill-tag">{s}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Recommended technician */}
            {recMember ? (
              <div className="sam-rec-section">
                <div className="sam-rec-label">Recommended Technician</div>
                <div className="sam-rec-card">
                  <Avatar name={recMember.name} color={recMember.avatar_color} size={44} />
                  <div className="sam-rec-info">
                    <div className="sam-rec-name">{recMember.name}</div>
                    <div className="sam-rec-role">{recMember.role}</div>
                    <div className="sam-rec-skill">✓ {skillReason}</div>
                    <div className="sam-rec-avail">🕐 {rec.remaining.toFixed(1)}h available today</div>
                    <CapacityBar usedHours={MAX_HOURS - rec.remaining} />
                  </div>
                </div>
                {rec.skippedBest && (
                  <div className="sam-capacity-note">
                    ⚠ <strong>{rec.skippedBest.member.name}</strong> is the best skill match but is at
                    capacity ({(MAX_HOURS - rec.skippedBest.remaining).toFixed(1)}h&nbsp;/&nbsp;{MAX_HOURS}h)
                    — recommending <strong>{recMember.name}</strong> instead
                    ({rec.remaining.toFixed(1)}h available
                    {rec.matching.length > 0 ? `, qualified: ${rec.matching.join(', ')}` : ''})
                  </div>
                )}
              </div>
            ) : (
              <div className="sam-rec-section">
                <div className="sam-rec-label">No Recommended Technician</div>
                <div className="sam-no-rec">
                  No available technicians found with matching skills. Assign manually or skip.
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="sam-actions">
              {recMember && (
                <button className="sam-btn-assign" onClick={() => doAssign(recMember.id, recMember.name)}>
                  Assign to {recMember.name} →
                </button>
              )}

              <div className="sam-actions-row2">
                {otherTechs.length > 0 && (
                  <button className="sam-btn-other" onClick={() => setShowOther(o => !o)}>
                    {showOther ? 'Cancel' : 'Assign to someone else'}
                  </button>
                )}
                <button className="sam-btn-skip" onClick={doSkip}>Skip for now</button>
              </div>

              {showOther && (
                <div className="sam-other-list">
                  {otherTechs.map(t => {
                    const shiftH    = parseShiftHours(t.shift_start, t.shift_end)
                    const usedH     = (t.assigned_hours || 0) + (sessionHours[t.id] || 0)
                    const remaining = Math.max(shiftH - usedH, 0)
                    return (
                      <button key={t.id} className="sam-other-row" onClick={() => doAssign(t.id, t.name)}>
                        <Avatar name={t.name} color={t.avatar_color} size={32} />
                        <div className="sam-other-info">
                          <span className="sam-other-name">{t.name}</span>
                          <span className="sam-other-meta">
                            {t.role} · {remaining.toFixed(1)}h available
                          </span>
                          <CapacityBar usedHours={MAX_HOURS - remaining} />
                        </div>
                        <span className="sam-other-pick">Select →</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
