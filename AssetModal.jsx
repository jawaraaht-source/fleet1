import { useState, useEffect } from 'react'
import { ASSET_TYPES } from '../constants.js'

const EMPTY = { name: '', asset_type: 'vehicle', identifier: '', make: '', model: '', year: '' }

export default function AssetModal({ asset, assets, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    setForm(asset ? {
      name: asset.name, asset_type: asset.asset_type, identifier: asset.identifier,
      make: asset.make, model: asset.model, year: asset.year || ''
    } : { ...EMPTY })
  }, [asset])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{asset ? 'Edit Asset' : 'Add Vehicle / Asset'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form id="asset-form" className="modal-form" onSubmit={e => { e.preventDefault(); onSave(form) }}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Truck 12, Van 4B, Gen Unit 1..." />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={form.asset_type} onChange={e => set('asset_type', e.target.value)}>
                {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Make</label>
              <input value={form.make} onChange={e => set('make', e.target.value)} placeholder="Ford, Cummins..." />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="F-750, Transit..." />
            </div>
            <div className="form-group" style={{ flex: 0.6 }}>
              <label>Year</label>
              <input type="number" min="1990" max="2030" value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Identifier (Plate / VIN / Serial)</label>
            <input value={form.identifier} onChange={e => set('identifier', e.target.value)} placeholder="PLT-4821, 1FDXF7DE..." />
          </div>
        </form>
        <div className="modal-actions">
            {asset && <button type="button" className="btn-danger" onClick={() => onDelete(asset.id)}>Remove</button>}
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" form="asset-form" className="btn-primary">Save</button>
          </div>
      </div>
    </div>
  )
}
