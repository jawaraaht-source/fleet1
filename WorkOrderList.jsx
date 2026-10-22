import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import WorkOrderCard from './WorkOrderCard.jsx'
import { PRIORITIES, SKILLS } from '../constants.js'

export default function WorkOrderList({ workOrders, onEdit, onCreate, dragSkills }) {
  const [filterPriority, setFilterPriority] = useState('')
  const [filterSkill, setFilterSkill] = useState('')
  const [search, setSearch] = useState('')

  const { setNodeRef, isOver } = useDroppable({ id: 'unassign-zone' })

  const unassigned = workOrders.filter(wo => {
    if (wo.status !== 'unassigned') return false
    if (filterPriority && wo.priority !== filterPriority) return false
    if (filterSkill && !wo.required_skills.includes(filterSkill)) return false
    if (search && !wo.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="work-order-list">
      <div className="list-header">
        <h2>Work Orders <span className="count-badge">{unassigned.length}</span></h2>
        <button className="btn-primary" onClick={onCreate}>+ Add</button>
      </div>

      <div className="filter-bar">
        <input
          className="filter-input"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select className="filter-select" value={filterSkill} onChange={e => setFilterSkill(e.target.value)}>
          <option value="">All skills</option>
          {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div ref={setNodeRef} className={`wo-cards ${isOver ? 'drop-zone-active' : ''}`}>
        {unassigned.length === 0 ? (
          <div className="empty-state">
            {workOrders.filter(w => w.status === 'unassigned').length === 0
              ? 'All work orders assigned!'
              : 'No matching work orders'}
          </div>
        ) : (
          unassigned.map(wo => (
            <WorkOrderCard key={wo.id} wo={wo} onEdit={onEdit} dragSkills={dragSkills} />
          ))
        )}
      </div>
    </div>
  )
}
