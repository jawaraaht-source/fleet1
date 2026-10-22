import { useState, useEffect } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import StatusBadge from './StatusBadge.jsx'
import WorkOrderDetailPanel from './WorkOrderDetailPanel.jsx'
import { formatRelativeDateTime } from '../utils/dateFormat.js'
import * as api from '../api.js'

// ── Simulated live-sync items ─────────────────────────────────────────────────
const FAKE_SYNC_ITEMS = [
  // ── Critical ──────────────────────────────────────────────────────────────
  {
    id: 9001, _type: 'dvir', asset_name: 'Truck 12', severity: 'critical',
    description: 'Brake pedal soft — spongy feel, possible air in brake lines. Vehicle grounded until inspected.',
    reported_by: 'M. Garcia', reported_at: new Date().toISOString(),
    computed_score: 130, computed_reasons: ['Driver-reported defect — DOT compliance risk'],
    required_skills: ['Brakes'], estimated_hours: 2,
    _synced: true,
  },
  {
    id: 9008, _type: 'dvir', asset_name: 'Truck 9', severity: 'critical',
    description: 'Oil pressure warning light illuminated — engine oil level critically low, possible pump failure.',
    reported_by: 'J. Torres', reported_at: new Date().toISOString(),
    computed_score: 125, computed_reasons: ['Driver-reported defect — engine damage risk'],
    required_skills: ['Diesel'], estimated_hours: 2,
    _synced: true,
  },
  // ── High ──────────────────────────────────────────────────────────────────
  {
    id: 9002, _type: 'fault_code', asset_name: 'Truck 7', severity: 'high',
    code: 'P0420', description: 'Catalyst System Efficiency Below Threshold (Bank 1)',
    detected_at: new Date().toISOString(),
    computed_score: 90, computed_reasons: ['Fault code — vehicle out-of-service risk'],
    required_skills: ['Diesel'], estimated_hours: 2,
    _synced: true,
  },
  {
    id: 9009, _type: 'dvir', asset_name: 'Van 4B', severity: 'high',
    description: 'Coolant hose leaking — visible drip at upper radiator hose connection. Risk of overheating.',
    reported_by: 'A. Kim', reported_at: new Date().toISOString(),
    computed_score: 88, computed_reasons: ['Driver-reported defect — overheating risk'],
    required_skills: ['General'], estimated_hours: 1.5,
    _synced: true,
  },
  {
    id: 9010, _type: 'fault_code', asset_name: 'Truck 3', severity: 'high',
    code: 'P0087', description: 'Fuel Rail / System Pressure Too Low — possible fuel pump or filter issue',
    detected_at: new Date().toISOString(),
    computed_score: 85, computed_reasons: ['Fault code — vehicle out-of-service risk'],
    required_skills: ['Diesel'], estimated_hours: 1.5,
    _synced: true,
  },
  {
    id: 9011, _type: 'pm', asset_name: 'Truck 12', severity: 'high',
    title: 'Air brake system test', description: 'Annual air brake performance test overdue by 14 days — DOT required.',
    next_due: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 365, status: 'overdue',
    computed_score: 82, computed_reasons: ['Overdue PM — DOT compliance risk'],
    required_skills: ['Brakes'], estimated_hours: 1,
    _synced: true,
  },
  {
    id: 9012, _type: 'dvir', asset_name: 'Van 2', severity: 'high',
    description: 'Power steering fluid low — heavy steering feel noted. Possible slow leak at power steering rack.',
    reported_by: 'R. Patel', reported_at: new Date().toISOString(),
    computed_score: 78, computed_reasons: ['Driver-reported defect — steering safety risk'],
    required_skills: ['General'], estimated_hours: 0.5,
    _synced: true,
  },
  // ── Medium ────────────────────────────────────────────────────────────────
  {
    id: 9003, _type: 'fault_code', asset_name: 'Van 4B', severity: 'medium',
    code: 'B1001', description: 'ABS Wheel Speed Sensor signal dropout at low speed',
    detected_at: new Date().toISOString(),
    computed_score: 75, computed_reasons: ['Fault code — vehicle out-of-service risk'],
    required_skills: ['Brakes'], estimated_hours: 1.5,
    _synced: true,
  },
  {
    id: 9013, _type: 'pm', asset_name: 'Truck 7', severity: 'medium',
    title: 'Transmission fluid flush', description: 'Transmission fluid overdue for full flush — 45,000 miles since last service.',
    next_due: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 730, status: 'overdue',
    computed_score: 72, computed_reasons: ['Overdue PM — transmission wear risk'],
    required_skills: ['Diesel'], estimated_hours: 2,
    _synced: true,
  },
  {
    id: 9014, _type: 'fault_code', asset_name: 'Van 6', severity: 'medium',
    code: 'B0080', description: 'HVAC Blower Motor circuit fault — intermittent fan failure in cab',
    detected_at: new Date().toISOString(),
    computed_score: 68, computed_reasons: ['Fault code — driver comfort and safety risk'],
    required_skills: ['HVAC'], estimated_hours: 1.5,
    _synced: true,
  },
  {
    id: 9015, _type: 'pm', asset_name: 'Truck 9', severity: 'medium',
    title: 'Rear differential service', description: 'Rear differential fluid change due — 30,000 miles since last drain and fill.',
    next_due: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 548, status: 'upcoming',
    computed_score: 65, computed_reasons: ['PM due soon — drivetrain health'],
    required_skills: ['Diesel'], estimated_hours: 2,
    _synced: true,
  },
  {
    id: 9016, _type: 'fault_code', asset_name: 'Van 2', severity: 'medium',
    code: 'U0100', description: 'Lost Communication with ECM/PCM — intermittent CAN bus dropout',
    detected_at: new Date().toISOString(),
    computed_score: 60, computed_reasons: ['Fault code — electrical system reliability risk'],
    required_skills: ['Electrical'], estimated_hours: 1,
    _synced: true,
  },
  {
    id: 9017, _type: 'pm', asset_name: 'Truck 3', severity: 'medium',
    title: 'Fuel filter replacement', description: 'Primary fuel filter replacement per 15,000-mile interval — currently at 14,800 miles.',
    next_due: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 180, status: 'upcoming',
    computed_score: 55, computed_reasons: ['PM due soon — fuel system performance'],
    required_skills: ['Diesel'], estimated_hours: 1,
    _synced: true,
  },
  {
    id: 9018, _type: 'pm', asset_name: 'Van 4B', severity: 'medium',
    title: 'Brake fluid flush', description: 'Brake fluid moisture content above threshold — full system flush required.',
    next_due: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 730, status: 'upcoming',
    computed_score: 52, computed_reasons: ['PM due soon — brake system safety'],
    required_skills: ['Brakes'], estimated_hours: 1.5,
    _synced: true,
  },
  // ── Low / Routine (no computed_reasons → quiet visual treatment) ──────────
  {
    id: 9004, _type: 'pm', asset_name: 'Truck 3', severity: 'low',
    title: 'Windshield wiper replacement', description: 'Inspect and replace front wiper blades per 6-month interval.',
    next_due: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 180, status: 'upcoming',
    computed_score: 12, computed_reasons: [],
    required_skills: ['General'], estimated_hours: 0.5,
    _synced: true,
  },
  {
    id: 9005, _type: 'pm', asset_name: 'Van 2', severity: 'low',
    title: 'Cabin air filter change', description: 'Replace cabin air filter — last changed over 12 months ago.',
    next_due: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 365, status: 'upcoming',
    computed_score: 10, computed_reasons: [],
    required_skills: ['General'], estimated_hours: 0.5,
    _synced: true,
  },
  {
    id: 9006, _type: 'pm', asset_name: 'Truck 9', severity: 'low',
    title: 'Tire pressure check', description: 'Monthly inflation check on all tires including spare.',
    next_due: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 30, status: 'upcoming',
    computed_score: 8, computed_reasons: [],
    required_skills: ['Tires'], estimated_hours: 0.5,
    _synced: true,
  },
  {
    id: 9007, _type: 'dvir', asset_name: 'Van 6', severity: 'low',
    description: 'Interior light bulb replacement — rear cargo area overhead lamp out.',
    reported_by: 'T. Brooks', reported_at: new Date().toISOString(),
    computed_score: 6, computed_reasons: [],
    required_skills: ['General'], estimated_hours: 0.5,
    _synced: true,
  },
  {
    id: 9019, _type: 'pm', asset_name: 'Truck 7', severity: 'low',
    title: 'Exhaust system inspection', description: 'Visual inspection of exhaust hangers, pipes, and muffler for rust or loose fittings.',
    next_due: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 365, status: 'upcoming',
    computed_score: 18, computed_reasons: [],
    required_skills: ['General'], estimated_hours: 1,
    _synced: true,
  },
  {
    id: 9020, _type: 'pm', asset_name: 'Van 2', severity: 'low',
    title: 'DEF fluid top-off', description: 'Diesel Exhaust Fluid level below 25% — top off to prevent SCR system lockout.',
    next_due: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 90, status: 'upcoming',
    computed_score: 15, computed_reasons: [],
    required_skills: ['General'], estimated_hours: 0.5,
    _synced: true,
  },
  {
    id: 9021, _type: 'pm', asset_name: 'Truck 12', severity: 'low',
    title: 'Battery terminal cleaning', description: 'Corrosion buildup on both battery terminals — clean and apply anti-corrosion spray.',
    next_due: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 180, status: 'upcoming',
    computed_score: 14, computed_reasons: [],
    required_skills: ['Electrical'], estimated_hours: 0.5,
    _synced: true,
  },
  {
    id: 9022, _type: 'pm', asset_name: 'Van 6', severity: 'low',
    title: 'Wiper motor inspection', description: 'Rear wiper intermittent — inspect motor connector and arm linkage.',
    next_due: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 365, status: 'upcoming',
    computed_score: 12, computed_reasons: [],
    required_skills: ['General'], estimated_hours: 1,
    _synced: true,
  },
  {
    id: 9023, _type: 'pm', asset_name: 'Truck 3', severity: 'low',
    title: 'Suspension check', description: 'Inspect front suspension components — ball joints, tie rods, and sway bar links.',
    next_due: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 365, status: 'upcoming',
    computed_score: 11, computed_reasons: [],
    required_skills: ['General'], estimated_hours: 1,
    _synced: true,
  },
  {
    id: 9024, _type: 'pm', asset_name: 'Van 4B', severity: 'low',
    title: 'Seat belt inspection', description: 'Inspect all seat belt webbing, buckles, and retractors for wear or damage.',
    next_due: new Date(Date.now() + 11 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 365, status: 'upcoming',
    computed_score: 9, computed_reasons: [],
    required_skills: ['General'], estimated_hours: 0.5,
    _synced: true,
  },
  {
    id: 9025, _type: 'pm', asset_name: 'Truck 9', severity: 'low',
    title: 'Headlight alignment', description: 'Headlight aim check — driver reports low-beam slightly off-axis.',
    next_due: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    last_completed: null, frequency_days: 365, status: 'upcoming',
    computed_score: 7, computed_reasons: [],
    required_skills: ['General'], estimated_hours: 0.5,
    _synced: true,
  },
]

const SEVERITY_COLORS   = { critical: '#E53E3E', high: '#DD6B20', medium: '#D69E2E', low: '#38A169' }
const PRIORITY_ORDER    = { critical: 4, high: 3, medium: 2, low: 1 }

// ── Task Card (tile) ──────────────────────────────────────────────────────────
function TaskCard({ item, sourceType, onPreview, onDismiss, isNew, isConverted, isSelectMode, isSelected, onSelect }) {
  const isRoutine = !item.computed_reasons?.length

  const borderColor = isConverted
    ? '#CBD5E0'
    : isRoutine
    ? '#CBD5E0'
    : sourceType === 'pm'
    ? (item.status === 'overdue' ? '#E53E3E' : '#3182CE')
    : (SEVERITY_COLORS[item.severity] || '#718096')

  const sourceLabel = sourceType === 'dvir' ? 'DVIR' : sourceType === 'fault_code' ? 'Fault Code' : 'PM'
  const sourceBg    = (isRoutine || isConverted) ? '#F7FAFC' : sourceType === 'dvir' ? '#FFF5F5' : sourceType === 'fault_code' ? '#FFFAF0' : '#EBF8FF'
  const sourceColor = (isRoutine || isConverted) ? '#718096' : sourceType === 'dvir' ? '#C53030' : sourceType === 'fault_code' ? '#C05621' : '#2B6CB0'

  const timestamp = sourceType === 'dvir'
    ? formatRelativeDateTime(item.reported_at)
    : sourceType === 'fault_code'
    ? formatRelativeDateTime(item.detected_at)
    : formatRelativeDateTime(item.next_due)

  const bodyText = sourceType === 'pm' ? item.title : item.description

  const handleCardClick = () => {
    if (isConverted) return
    if (isSelectMode) { onSelect?.(); return }
    onPreview(item)
  }

  return (
    <div
      className={`task-card${isNew ? ' task-card--new' : ''}${isRoutine && !isConverted ? ' task-card--routine' : ''}${isConverted ? ' task-card--converted' : ''}${isSelectMode && isSelected ? ' task-card--selected' : ''}${isSelectMode && !isConverted ? ' task-card--selectable' : ''}`}
      style={{ borderLeftColor: isSelected ? '#3182CE' : borderColor }}
      onClick={handleCardClick}
    >
      {/* Checkbox in select mode */}
      {isSelectMode && !isConverted && (
        <div className="task-card-checkbox" onClick={e => { e.stopPropagation(); onSelect?.() }}>
          <div className={`tc-checkbox${isSelected ? ' tc-checkbox--checked' : ''}`}>
            {isSelected && <span>✓</span>}
          </div>
        </div>
      )}

      {/* Top meta row */}
      <div className="task-card-meta">
        <span className="task-source-badge" style={{ background: sourceBg, color: sourceColor }}>
          {sourceLabel}
        </span>
        {sourceType === 'pm' && item.status === 'overdue' && !isConverted && <span className="overdue-chip">Overdue</span>}
        {sourceType === 'fault_code' && item.code && !isConverted && (
          <span className="fault-code-badge">{item.code}</span>
        )}
      </div>

      {/* Asset */}
      {item.asset_name && (
        <div className="task-card-asset">🚗 {item.asset_name}</div>
      )}

      {/* Main description / title */}
      <div className="task-card-body">{bodyText}</div>

      {/* Supporting detail */}
      {!isConverted && sourceType === 'dvir' && item.reported_by && (
        <div className="task-card-sub">By {item.reported_by}</div>
      )}
      {!isConverted && sourceType === 'pm' && (
        <div className="task-card-sub">
          Last: {item.last_completed ? formatRelativeDateTime(item.last_completed) : 'Never'}
          {' · '}every {item.frequency_days}d
        </div>
      )}

      {/* Converted badge OR normal footer */}
      {isConverted ? (
        <div className="task-card-converted-badge">✓ Work order created</div>
      ) : (
        <>
          <div className="task-card-footer">
            <div className="task-card-date">{timestamp}</div>
            {item.computed_reasons?.length > 0 && (
              <div className="task-card-reason">→ {item.computed_reasons[0]}</div>
            )}
          </div>
          {!isSelectMode && (
            <div className="task-card-actions" onClick={e => e.stopPropagation()}>
              <button className="btn-create-wo" onClick={() => onPreview(item)}>
                Create WO →
              </button>
              {sourceType !== 'pm' && onDismiss && (
                <button className="btn-ghost btn-sm" onClick={() => onDismiss(item.id)}>Dismiss</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Work Order Row ────────────────────────────────────────────────────────────
function WorkOrderRow({ wo, rank, isTop, isManual, isAppearing, dragHandleProps, onOpen, assignments }) {
  const isUrgent   = rank <= 3
  const reason     = wo.priority_reason || wo.computed_reasons?.[0]
  const assignment = assignments?.[wo.id]

  return (
    <div
      className={`wo-row${wo.is_candidate ? ' wo-row--candidate' : ''}${isTop ? ' wo-row--top' : ''}${!isUrgent ? ' wo-row--dim' : ''}${isAppearing ? ' wo-row--appearing' : ''}`}
      onClick={() => onOpen && onOpen(wo)}
    >
      {/* Drag handle */}
      <div
        className="wo-drag-handle"
        onClick={e => e.stopPropagation()}
        {...(dragHandleProps?.attributes || {})}
        {...(dragHandleProps?.listeners || {})}
      >
        ⠿
      </div>

      {/* Rank bubble */}
      <div className={`wo-row-rank${isUrgent ? '' : ' wo-row-rank--dim'}`}>{rank}</div>

      {/* Body */}
      <div className="wo-row-body">
        <div className="wo-row-title">
          {wo.title}
          {isManual && <span className="manual-badge">Manually reordered</span>}
        </div>
        <div className="wo-row-meta">
          {wo.asset_name && <span className="wo-meta-asset">🚗 {wo.asset_name}</span>}
          <span className="wo-meta-hours">{wo.estimated_hours}h</span>
          {assignment
            ? <span className="wo-meta-assigned">👤 {assignment.memberName}</span>
            : <span className="wo-meta-unassigned">Unassigned</span>
          }
        </div>
        {isUrgent && reason && (
          <div className="wo-row-reason">→ {reason}</div>
        )}
        {!isUrgent && wo.description && (
          <div className="wo-row-desc">{wo.description}</div>
        )}
      </div>
    </div>
  )
}

// ── Sortable wrapper ──────────────────────────────────────────────────────────
function SortableWorkOrderRow(props) {
  const { wo } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: wo.id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 20 : 'auto',
        position: 'relative',
      }}
    >
      {/* assignments is forwarded via spread through props */}
      <WorkOrderRow {...props} dragHandleProps={{ attributes, listeners }} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UnifiedTaskList({
  sessionWOs = [],
  convertedTaskKeys,
  assignments = {},
  dvirItems, faultItems, pmItems,
  onPreviewTask,
  onDismissDVIR, onDismissFault,
  onAddDVIR, onAddFault, onAddPM, onManageAssets,
  onAssignClick, onClearWOs, onBulkCreate,
}) {
  const [hasSynced,    setHasSynced]    = useState(false)
  const [syncedItems,  setSyncedItems]  = useState([])
  const [syncing,      setSyncing]      = useState(false)
  const [orderedIds,   setOrderedIds]   = useState(null)
  const [manuallyMoved, setManuallyMoved] = useState(new Set())
  const [newWOIds,     setNewWOIds]     = useState(new Set())
  const [panelWO,      setPanelWO]      = useState(null)
  // ── Select mode ───────────────────────────────────────────────────────────
  const [selectMode,   setSelectMode]   = useState(false)
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [bulkToast,    setBulkToast]    = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // ── Select mode helpers ───────────────────────────────────────────────────
  function enterSelectMode() { setSelectMode(true); setSelectedKeys(new Set()) }
  function exitSelectMode()  { setSelectMode(false); setSelectedKeys(new Set()) }
  function toggleSelect(key) {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  function selectAll() {
    const allKeys = newTasks
      .filter(item => !convertedTaskKeys?.has(`${item._type}-${item.id}`))
      .map(item => `${item._type}-${item.id}`)
    setSelectedKeys(new Set(allKeys))
  }

  function handleBulkCreate() {
    const selectedItems = newTasks.filter(item => {
      const key = `${item._type}-${item.id}`
      return selectedKeys.has(key)
    })
    if (!selectedItems.length) return
    onBulkCreate?.(selectedItems)
    const count = selectedItems.length
    exitSelectMode()
    setBulkToast(`${count} work order${count === 1 ? '' : 's'} created`)
    setTimeout(() => setBulkToast(null), 3500)
  }

  // Track newly added WOs for entrance animation
  useEffect(() => {
    const freshIds = sessionWOs.filter(w => w._isNew).map(w => w.id)
    if (!freshIds.length) return
    setNewWOIds(prev => new Set([...prev, ...freshIds]))
    const timer = setTimeout(() => {
      setNewWOIds(prev => {
        const next = new Set(prev)
        freshIds.forEach(id => next.delete(id))
        return next
      })
    }, 700)
    return () => clearTimeout(timer)
  }, [sessionWOs])

  // Only show task cards after sync
  const newTasks = hasSynced ? [
    ...dvirItems.map(d => ({ ...d, _type: 'dvir' })),
    ...faultItems.map(f => ({ ...f, _type: 'fault_code' })),
    ...pmItems.map(p => ({ ...p, _type: 'pm' })),
    ...syncedItems,
  ].sort((a, b) => (b.computed_score || 0) - (a.computed_score || 0)) : []

  // Sort session WOs by priority then score
  const sortedSessionWOs = [...sessionWOs].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] || 0
    const pb = PRIORITY_ORDER[b.priority] || 0
    if (pa !== pb) return pb - pa
    return (b.computed_score || 0) - (a.computed_score || 0)
  })

  // Apply manual reorder on top
  const displayWOs = orderedIds
    ? orderedIds.map(id => sortedSessionWOs.find(w => w.id === id)).filter(Boolean)
    : sortedSessionWOs

  // ── Sync ─────────────────────────────────────────────────────────────────────
  function handleSync() {
    if (syncing) return
    setSyncing(true)
    setSyncedItems([])
    setTimeout(() => {
      setHasSynced(true)
      setSyncedItems(FAKE_SYNC_ITEMS)
      setSyncing(false)
    }, 1800)
  }

  function handleReset() {
    setHasSynced(false)
    setSyncedItems([])
  }

  // ── Drag reorder ──────────────────────────────────────────────────────────────
  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIdx = displayWOs.findIndex(w => w.id === active.id)
    const newIdx = displayWOs.findIndex(w => w.id === over.id)
    const reordered = arrayMove(displayWOs, oldIdx, newIdx)
    setOrderedIds(reordered.map(w => w.id))
    setManuallyMoved(prev => new Set([...prev, active.id]))
    reordered.forEach((wo, i) => {
      api.setPriorityRank(wo.id, i + 1, wo.priority_reason || '').catch(() => {})
    })
  }

  return (
    <div className="unified-task-list">

      {/* ── Toolbar ── */}
      <div className="utl-toolbar">
        <div className="utl-toolbar-left">
          <button className="btn-ghost btn-sm" onClick={onAddDVIR}>+ DVIR</button>
          <button className="btn-ghost btn-sm" onClick={onAddFault}>+ Fault Code</button>
          <button className="btn-ghost btn-sm" onClick={onAddPM}>+ PM Schedule</button>
          <button className="btn-ghost btn-sm" onClick={onManageAssets}>🚗 Assets</button>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="utl-cols">

        {/* ── Left: New Tasks ── */}
        <div className="utl-col utl-col--left" style={{ position: 'relative' }}>
          <div className={`utl-col-header${syncing ? ' utl-col-header--syncing' : ''}${selectMode ? ' utl-col-header--select' : ''}`}>
            <span className="utl-section-title">🔔 New Tasks</span>
            {selectMode
              ? <span className="utl-section-count utl-section-count--selected">{selectedKeys.size} selected</span>
              : newTasks.length > 0 && <span className="utl-section-count">{newTasks.length}</span>
            }
            <div className="utl-col-header-actions">
              {selectMode ? (
                <>
                  <button className="btn-ghost btn-sm" onClick={selectAll}>All</button>
                  <button
                    className={`bulk-create-btn-inline${selectedKeys.size === 0 ? ' bulk-create-btn-inline--disabled' : ''}`}
                    disabled={selectedKeys.size === 0}
                    onClick={handleBulkCreate}
                  >
                    Create WOs ({selectedKeys.size})
                  </button>
                  <button className="reset-btn" onClick={exitSelectMode}>Cancel</button>
                </>
              ) : (
                <>
                  {hasSynced ? (
                    <>
                      <button
                        className={`sync-btn${syncing ? ' sync-btn--active' : ''}`}
                        onClick={handleSync}
                        disabled={syncing}
                      >
                        <span className={`sync-icon${syncing ? ' sync-spinning' : ''}`}>⟳</span>
                        {syncing ? 'Syncing…' : 'Sync'}
                      </button>
                      <button className="reset-btn" onClick={handleReset} disabled={syncing}>
                        ✕ Reset
                      </button>
                    </>
                  ) : (
                    <button
                      className={`sync-btn sync-btn--prominent${syncing ? ' sync-btn--active' : ''}`}
                      onClick={handleSync}
                      disabled={syncing}
                    >
                      <span className={`sync-icon${syncing ? ' sync-spinning' : ''}`}>⟳</span>
                      {syncing ? 'Syncing…' : 'Sync Fleet Data'}
                    </button>
                  )}
                  {newTasks.length > 0 && (
                    <button className="select-mode-btn" onClick={enterSelectMode}>
                      Select
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="utl-col-body">
            {newTasks.length > 0 ? (
              <div className="task-card-list">
                {newTasks.map(item => {
                  const taskKey = `${item._type}-${item.id}`
                  const isConverted = convertedTaskKeys?.has(taskKey)
                  return (
                    <TaskCard
                      key={taskKey}
                      item={item}
                      sourceType={item._type}
                      onPreview={i => onPreviewTask(item._type, i)}
                      onDismiss={
                        item._type === 'dvir'       ? onDismissDVIR :
                        item._type === 'fault_code' ? onDismissFault :
                        null
                      }
                      isNew={!!item._synced}
                      isConverted={isConverted}
                      isSelectMode={selectMode}
                      isSelected={selectedKeys.has(taskKey)}
                      onSelect={() => !isConverted && toggleSelect(taskKey)}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="utl-empty-tasks">
                {syncing
                  ? 'Pulling live data from fleet…'
                  : 'No new tasks — sync to pull latest fleet data.'
                }
              </div>
            )}
          </div>

          {/* ── Bulk toast (shows after exiting select mode) ── */}
          {!selectMode && bulkToast && (
            <div className="bulk-toast-floating">✓ {bulkToast}</div>
          )}
        </div>

        {/* ── Right: Prioritized Work Orders ── */}
        <div className="utl-col utl-col--right">
          <div className="utl-col-header">
            <div className="utl-col-header-text">
              <span className="utl-section-title">📋 Prioritized Work Orders</span>
              {displayWOs.length > 0 && <span className="utl-section-count">{displayWOs.length}</span>}
            </div>
            {displayWOs.length > 0 && (
              <button className="clear-wo-btn" onClick={() => { setOrderedIds(null); setManuallyMoved(new Set()); onClearWOs?.() }}>
                Clear
              </button>
            )}
            <button
              className={`assign-wo-btn${displayWOs.length === 0 ? ' assign-wo-btn--disabled' : ''}`}
              disabled={displayWOs.length === 0}
              onClick={() => onAssignClick(displayWOs)}
            >
              Assign Work Orders
            </button>
          </div>

          <div className="utl-col-body">
            {displayWOs.length === 0 ? (
              <div className="utl-wo-empty">
                <div className="utl-wo-empty-box">
                  Work orders will appear here as you create them from new tasks.
                </div>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={displayWOs.map(w => w.id)} strategy={verticalListSortingStrategy}>
                  <div className="wo-rows">
                    {displayWOs.map((wo, i) => (
                      <SortableWorkOrderRow
                        key={wo.id}
                        wo={wo}
                        rank={i + 1}
                        isTop={i === 0}
                        isManual={manuallyMoved.has(wo.id)}
                        isAppearing={newWOIds.has(wo.id)}
                        assignments={assignments}
                        onOpen={setPanelWO}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

      </div>

      {/* ── Work Order Detail Panel ── */}
      {panelWO && (
        <WorkOrderDetailPanel
          wo={panelWO}
          assignments={assignments}
          onClose={() => setPanelWO(null)}
          onAssignClick={() => { setPanelWO(null); onAssignClick?.(displayWOs) }}
        />
      )}

    </div>
  )
}
