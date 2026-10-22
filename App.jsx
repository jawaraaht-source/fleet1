import { useState, useEffect } from 'react'

import { useWorkOrders } from './hooks/useWorkOrders.js'
import { useTeam } from './hooks/useTeam.js'
import { useUnifiedList } from './hooks/useUnifiedList.js'
import { useAssets } from './hooks/useAssets.js'

import Header from './components/Header.jsx'
import DayPlanView from './components/DayPlanView.jsx'
import UnifiedTaskList from './components/UnifiedTaskList.jsx'
import WorkOrderPreviewModal from './components/WorkOrderPreviewModal.jsx'
import SuggestAssignModal from './components/SuggestAssignModal.jsx'
import AssetModal from './components/AssetModal.jsx'
import DVIRModal from './components/DVIRModal.jsx'
import FaultCodeModal from './components/FaultCodeModal.jsx'
import PMScheduleModal from './components/PMScheduleModal.jsx'
import * as api from './api.js'
import { buildAutoForm } from './utils/woAutoFill.jsx'

export default function App() {
  const today    = new Date().toISOString().split('T')[0]
  const [planDate] = useState(today)
  const [view, setView] = useState('tasks')

  // ── Modal / overlay state ─────────────────────────────────────────────────
  const [showSuggestions,  setShowSuggestions]  = useState(false)
  const [suggestOrderedWOs, setSuggestOrderedWOs] = useState([])  // ordered at click time
  const [previewSource,    setPreviewSource]    = useState(null)   // { sourceType, item }

  // ── Session work orders (Tasks → Prioritized Work Orders column) ──────────
  const [sessionWOs,           setSessionWOs]           = useState([])
  const [convertedTaskKeys,    setConvertedTaskKeys]    = useState(new Set())
  // Assignments from the sequential modal: { woId: { memberId, memberName } }
  const [sessionWOAssignments, setSessionWOAssignments] = useState({})

  // ── Asset / DVIR / Fault / PM modal state ─────────────────────────────────
  const [editingAsset,   setEditingAsset]   = useState(null)   // asset obj or 'new'
  const [showAssets,     setShowAssets]     = useState(false)
  const [showDVIRModal,  setShowDVIRModal]  = useState(false)
  const [showFaultModal, setShowFaultModal] = useState(false)
  const [editingPM,      setEditingPM]      = useState(null)   // pm obj or 'new'

  // ── Data hooks ────────────────────────────────────────────────────────────
  const { workOrders, refresh: refreshWOs } = useWorkOrders(planDate)
  const { team } = useTeam(planDate)
  const { assets, create: createAsset, update: updateAsset, remove: removeAsset } = useAssets()
  const {
    dvirItems, faultItems, pmItems,
    dismissDVIR, dismissFault,
    refresh: refreshUnified,
  } = useUnifiedList(planDate)

  // ── Header stats (from DB work orders) ───────────────────────────────────
  const stats = {
    total:     workOrders.length,
    assigned:  workOrders.filter(w => w.assigned_to).length,
    unassigned: workOrders.filter(w => !w.assigned_to).length,
    completed: workOrders.filter(w => w.status === 'completed').length,
  }

  // ── Asset modal ───────────────────────────────────────────────────────────
  const handleSaveAsset = async (data) => {
    if (editingAsset === 'new') await createAsset(data)
    else await updateAsset(editingAsset.id, data)
    setEditingAsset(null)
  }
  const handleDeleteAsset = async (id) => { await removeAsset(id); setEditingAsset(null) }

  // ── DVIR ──────────────────────────────────────────────────────────────────
  const handleSaveDVIR = async (data) => {
    await api.createDVIR(data)
    setShowDVIRModal(false)
    refreshUnified()
  }

  // ── Fault Code ────────────────────────────────────────────────────────────
  const handleSaveFault = async (data) => {
    await api.createFaultCode(data)
    setShowFaultModal(false)
    refreshUnified()
  }

  // ── PM Schedule ───────────────────────────────────────────────────────────
  const handleSavePM = async (data) => {
    if (editingPM === 'new') await api.createPMSchedule(data)
    else await api.updatePMSchedule(editingPM.id, data)
    setEditingPM(null)
    refreshUnified()
  }
  const handleDeletePM = async (id) => {
    await api.deletePMSchedule(id)
    setEditingPM(null)
    refreshUnified()
  }

  // ── Assignment modal callback ─────────────────────────────────────────────
  const handleModalAssign = (woId, memberId, memberName) => {
    setSessionWOAssignments(prev => ({ ...prev, [woId]: { memberId, memberName } }))
  }

  // ── Preview / Create from task ────────────────────────────────────────────
  const handlePreviewTask = (sourceType, item) => setPreviewSource({ sourceType, item })

  const handleConfirmFromPreview = async (formData) => {
    const { sourceType, item } = previewSource
    let result
    try {
      if (sourceType === 'dvir')       result = await api.dvirCreateWorkOrder(item.id, formData)
      if (sourceType === 'fault_code') result = await api.faultCreateWorkOrder(item.id, formData)
      if (sourceType === 'pm')         result = await api.pmCreateWorkOrder(item.id, formData)
      refreshUnified()
    } catch (_) {
      // Simulated items (fake sync IDs) don't exist in DB — skip the API, still create locally
    }
    setPreviewSource(null)

    // Build a local WO object for the right column
    const priority = formData.priority || item.severity || 'medium'
    const SCORE_MAP = { critical: 120, high: 80, medium: 50, low: 20 }
    const newWO = {
      id: result?.id || Date.now(),
      title: formData.title || item.title || item.description || 'Work Order',
      priority,
      asset_name: item.asset_name || '',
      estimated_hours: parseFloat(formData.estimated_hours) || 1.0,
      description: formData.description || item.description || '',
      priority_reason: item.computed_reasons?.[0] || '',
      computed_score: item.computed_score || SCORE_MAP[priority] || 50,
      required_skills: formData.required_skills || item.required_skills || [],
      location: formData.location || '',
      status: 'open',
      _isNew: true,
    }
    const taskKey = `${sourceType}-${item.id}`
    setSessionWOs(prev => [...prev, newWO])
    setConvertedTaskKeys(prev => new Set([...prev, taskKey]))
  }

  // ── Bulk create from selected tasks (no modal) ───────────────────────────
  const handleBulkCreate = (selectedItems) => {
    const SCORE_MAP = { critical: 120, high: 80, medium: 50, low: 20 }
    const newWOs = []
    const newKeys = []

    selectedItems.forEach((item, i) => {
      const sourceType = item._type
      const formData   = buildAutoForm(sourceType, item)
      const priority   = formData.priority || item.severity || 'medium'
      const wo = {
        id: Date.now() + i,
        title: formData.title,
        priority,
        asset_name:      item.asset_name || '',
        estimated_hours: parseFloat(formData.estimated_hours) || 1.0,
        description:     formData.description || '',
        priority_reason: item.computed_reasons?.[0] || '',
        computed_score:  item.computed_score || SCORE_MAP[priority] || 50,
        required_skills: formData.required_skills || [],
        location:        formData.location || '',
        notes:           formData.notes || '',
        status: 'open',
        _isNew: true,
        _bulkIdx: i,   // stagger marker
      }
      newWOs.push(wo)
      newKeys.push(`${sourceType}-${item.id}`)
    })

    // Stagger additions so cards animate in one-by-one (120ms apart)
    newWOs.forEach((wo, i) => {
      setTimeout(() => {
        setSessionWOs(prev => [...prev, wo])
      }, i * 120)
    })

    setConvertedTaskKeys(prev => new Set([...prev, ...newKeys]))
  }

  // ── Clear session ─────────────────────────────────────────────────────────
  const handleClearWOs = () => {
    setSessionWOs([])
    setConvertedTaskKeys(new Set())
    setSessionWOAssignments({})
  }

  return (
    <div className="app">
      <Header
        planDate={planDate}
        view={view}
        onViewChange={setView}
        stats={stats}
      />

      <main className="app-main app-main--fixed">

        {view === 'tasks' && (
          <UnifiedTaskList
            sessionWOs={sessionWOs}
            convertedTaskKeys={convertedTaskKeys}
            assignments={sessionWOAssignments}
            dvirItems={dvirItems}
            faultItems={faultItems}
            pmItems={pmItems}
            onPreviewTask={handlePreviewTask}
            onDismissDVIR={dismissDVIR}
            onDismissFault={dismissFault}
            onAddDVIR={() => setShowDVIRModal(true)}
            onAddFault={() => setShowFaultModal(true)}
            onAddPM={() => setEditingPM('new')}
            onManageAssets={() => setShowAssets(true)}
            onAssignClick={(orderedWOs) => { setSuggestOrderedWOs(orderedWOs); setShowSuggestions(true) }}
            onBulkCreate={handleBulkCreate}
            onClearWOs={handleClearWOs}
          />
        )}

        {view === 'dayplan' && (
          <DayPlanView
            team={team}
            workOrders={workOrders}
            sessionWOs={sessionWOs}
            sessionWOAssignments={sessionWOAssignments}
            onReassign={handleModalAssign}
          />
        )}

      </main>

      {/* ── Sequential assignment modal ── */}
      {showSuggestions && (
        <SuggestAssignModal
          workOrders={suggestOrderedWOs}
          team={team}
          assignments={sessionWOAssignments}
          onAssign={handleModalAssign}
          onClose={() => setShowSuggestions(false)}
          onViewDayPlan={() => { setShowSuggestions(false); setView('dayplan') }}
        />
      )}

      {/* ── Preview modal — pre-filled WO form from task source ── */}
      {previewSource && (
        <WorkOrderPreviewModal
          sourceType={previewSource.sourceType}
          sourceItem={previewSource.item}
          onConfirm={handleConfirmFromPreview}
          onClose={() => setPreviewSource(null)}
        />
      )}

      {/* ── Asset management ── */}
      {showAssets && (
        <div className="modal-overlay" onClick={() => setShowAssets(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Fleet Assets</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-primary" onClick={() => { setShowAssets(false); setEditingAsset('new') }}>+ Add Asset</button>
                <button className="modal-close" onClick={() => setShowAssets(false)}>✕</button>
              </div>
            </div>
            <div style={{ padding: '12px 20px', overflowY: 'auto', maxHeight: '60vh' }}>
              {assets.length === 0 && <div className="empty-state">No assets yet.</div>}
              {assets.map(a => (
                <div key={a.id} className="asset-list-row" onClick={() => { setShowAssets(false); setEditingAsset(a) }}>
                  <div>
                    <div className="asset-list-name">{a.name}</div>
                    <div className="asset-list-meta">{a.year} {a.make} {a.model} {a.identifier && `· ${a.identifier}`}</div>
                  </div>
                  <div className="asset-list-alerts">
                    {a.open_dvir > 0   && <span className="alert-chip dvir-chip">{a.open_dvir} DVIR</span>}
                    {a.open_faults > 0 && <span className="alert-chip fault-chip">{a.open_faults} Faults</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingAsset !== null && (
        <AssetModal
          asset={editingAsset === 'new' ? null : editingAsset}
          assets={assets}
          onSave={handleSaveAsset}
          onDelete={handleDeleteAsset}
          onClose={() => setEditingAsset(null)}
        />
      )}

      {showDVIRModal && (
        <DVIRModal assets={assets} onSave={handleSaveDVIR} onClose={() => setShowDVIRModal(false)} />
      )}

      {showFaultModal && (
        <FaultCodeModal assets={assets} onSave={handleSaveFault} onClose={() => setShowFaultModal(false)} />
      )}

      {editingPM !== null && (
        <PMScheduleModal
          pm={editingPM === 'new' ? null : editingPM}
          assets={assets}
          onSave={handleSavePM}
          onDelete={handleDeletePM}
          onClose={() => setEditingPM(null)}
        />
      )}
    </div>
  )
}
