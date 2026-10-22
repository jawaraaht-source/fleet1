import { useState } from 'react'
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { ROSTER } from '../constants.js'
import { CapacityBar } from './SuggestAssignModal.jsx'

// ── Grid constants ────────────────────────────────────────────────────────────
const HOUR_START  = 7
const HOUR_END    = 19
const TOTAL_HOURS = HOUR_END - HOUR_START
const SLOT_HEIGHT = 56
const MAX_HOURS   = 9

const PRIORITY_LABELS = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}
const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 }

// ── Helpers ───────────────────────────────────────────────────────────────────
function nowOffset() {
  const d = new Date()
  return (d.getHours() + d.getMinutes() / 60) - HOUR_START
}

function hourLabel(h) {
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

function memberInitials(name) {
  return (name || '').trim().split(/\s+/).map(p => p[0]).join('').toUpperCase()
}

const MIN_BLOCK_PX = 68

function stackBlocks(wos) {
  const sorted = [...wos].sort((a, b) =>
    (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0)
  )
  let cursor = 8 - HOUR_START   // always start at 8 AM
  return sorted.map(wo => {
    const hours  = wo.estimated_hours || 1
    const top    = cursor * SLOT_HEIGHT
    const height = Math.max(hours * SLOT_HEIGHT, MIN_BLOCK_PX)
    cursor += hours
    return { wo, top, height }
  })
}

// ── Draggable block ───────────────────────────────────────────────────────────
function DraggableBlock({ wo, top, height }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `wo-${wo.id}`,
    data: { wo },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`day-block day-block--session priority-${wo.priority}${isDragging ? ' day-block--dragging' : ''}`}
      style={{
        top,
        height,
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 999 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      title={`${wo.title} (${wo.estimated_hours}h) — drag to reassign`}
    >
      <div className="day-block-priority-label">{PRIORITY_LABELS[wo.priority] || wo.priority}</div>
      <div className="day-block-title">{wo.title}</div>
      <div className="day-block-hours">{wo.estimated_hours}h</div>
    </div>
  )
}

// ── Droppable column body ─────────────────────────────────────────────────────
function DroppableColumnBody({ memberId, isOver, isEmpty, children }) {
  const { setNodeRef } = useDroppable({ id: `column-${memberId}` })
  return (
    <div
      ref={setNodeRef}
      className="day-column-body"
      style={{
        height: TOTAL_HOURS * SLOT_HEIGHT,
        position: 'relative',
        background: isOver ? 'rgba(49,130,206,0.06)' : undefined,
        outline: isOver ? '2px dashed #3182CE' : undefined,
        outlineOffset: '-3px',
        borderRadius: isOver ? 6 : undefined,
        transition: 'background 0.15s, outline 0.1s',
      }}
    >
      {children}
      {isEmpty && (
        <div className="day-col-empty">
          {isOver ? '↓ Drop to assign' : 'No work assigned'}
        </div>
      )}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message }) {
  return <div className="day-toast">⚠ {message}</div>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DayPlanView({
  team = [],
  workOrders = [],
  sessionWOs = [],
  sessionWOAssignments = {},
  onReassign,
}) {
  const [toast,      setToast]      = useState(null)
  const [activeOver, setActiveOver] = useState(null)

  const hours   = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i)
  const nowOff  = nowOffset()
  const nowTop  = nowOff * SLOT_HEIGHT
  const showNow = nowOff >= 0 && nowOff <= TOTAL_HOURS

  const columns = team.length > 0 ? team : ROSTER.map((r, i) => ({ ...r, id: -(i + 1) }))

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function showToastMsg(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function handleDragEnd({ active, over }) {
    setActiveOver(null)
    if (!over || !onReassign) return

    const wo             = active.data.current?.wo
    const woId           = wo?.id
    const targetMemberId = over.id.replace('column-', '')
    const currentId      = String(sessionWOAssignments[woId]?.memberId ?? '')

    if (!woId || currentId === targetMemberId) return

    const targetMember = columns.find(m => String(m.id) === targetMemberId)
    if (!targetMember) return

    // Capacity check on receiving column
    const targetUsed = sessionWOs
      .filter(w => String(sessionWOAssignments[w.id]?.memberId) === targetMemberId && w.id !== woId)
      .reduce((sum, w) => sum + (w.estimated_hours || 1), 0)
    const newTotal = targetUsed + (wo.estimated_hours || 1)

    if (newTotal > MAX_HOURS) {
      showToastMsg(
        `${targetMember.name} will exceed available hours (${newTotal.toFixed(1)}h / ${MAX_HOURS}h) — assignment saved anyway`
      )
    }

    onReassign(woId, targetMember.id, targetMember.name)
  }

  function handleDragOver({ over }) {
    setActiveOver(over?.id ?? null)
  }

  return (
    <div className="day-plan-view" style={{ position: 'relative' }}>
      {toast && <Toast message={toast} />}

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragCancel={() => setActiveOver(null)}
      >
        <div className="day-grid-container">
          <div className="day-grid" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(160px, 1fr))` }}>

            {/* ── Time axis ── */}
            <div className="time-axis">
              <div className="time-axis-header" />
              {hours.map(h => (
                <div key={h} className="time-slot-label" style={{ height: SLOT_HEIGHT }}>
                  {hourLabel(h)}
                </div>
              ))}
            </div>

            {/* ── Technician columns ── */}
            {columns.map(member => {
              const sessionForMember = sessionWOs.filter(
                wo => String(sessionWOAssignments[wo.id]?.memberId) === String(member.id)
              )
              const dbForMember = workOrders.filter(
                wo => wo.assigned_to === member.id && !sessionWOs.some(s => s.id === wo.id)
              )
              const allWOs    = [...sessionForMember, ...dbForMember]
              const blocks    = stackBlocks(allWOs)
              const isEmpty   = allWOs.length === 0
              const usedHours = allWOs.reduce((sum, wo) => sum + (wo.estimated_hours || 1), 0)
              const isOver    = activeOver === `column-${member.id}`

              return (
                <div key={member.id} className="day-column">
                  {/* Column header */}
                  <div className="day-column-header">
                    <div
                      className="member-avatar sm"
                      style={{ background: member.avatar_color || '#718096' }}
                    >
                      {memberInitials(member.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="member-name">{member.name}</div>
                      <div className="member-role">{member.role}</div>
                      <CapacityBar usedHours={usedHours} />
                    </div>
                  </div>

                  {/* Column body (droppable) */}
                  <DroppableColumnBody memberId={member.id} isOver={isOver} isEmpty={isEmpty}>
                    {/* Hour grid lines */}
                    {hours.map(h => (
                      <div
                        key={h}
                        className="hour-line"
                        style={{ top: (h - HOUR_START) * SLOT_HEIGHT }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {showNow && <div className="day-now-line" style={{ top: nowTop }} />}

                    {/* Work order blocks (draggable) */}
                    {blocks.map(({ wo, top, height }) => (
                      <DraggableBlock key={wo.id} wo={wo} top={top} height={height} />
                    ))}
                  </DroppableColumnBody>
                </div>
              )
            })}

          </div>
        </div>
      </DndContext>
    </div>
  )
}
