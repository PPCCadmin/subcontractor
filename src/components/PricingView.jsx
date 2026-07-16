import React, { useMemo, useState } from 'react'
import { CloseIcon } from './icons.jsx'
import { PRICING_CATEGORIES } from '../data.js'
import { isPricingAnomaly, pricingStats } from '../lib/metrics.js'

const UNITS = ['LF', 'SF', 'EA', 'TON', 'CY', 'LS', 'HR', 'Other']

export default function PricingView({ pricing, setPricing, subs, projects }) {
  const [showNew, setShowNew] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')

  const create = (entry) => {
    setPricing(prev => [{ ...entry, id: crypto.randomUUID() }, ...prev])
    setShowNew(false)
  }
  const del = (id) => {
    if (confirm('Delete this pricing entry?')) setPricing(prev => prev.filter(p => p.id !== id))
  }

  const filtered = filterCategory ? pricing.filter(p => p.category === filterCategory) : pricing
  const stats = useMemo(() => filterCategory ? pricingStats(filtered) : null, [filtered, filterCategory])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Pricing Database</h2>
          <p className="page-sub">Track line-item pricing. Anomalies flagged when &gt;2σ from category average.</p>
        </div>
        <button className="btn" onClick={() => setShowNew(true)}>+ Add Entry</button>
      </div>

      <div className="filter-section" style={{ padding: 0, marginBottom: 12, background: 'transparent', border: 'none' }}>
        <div className="chips">
          <div className={'chip' + (filterCategory === '' ? ' active' : '')}
               onClick={() => setFilterCategory('')}>All ({pricing.length})</div>
          {PRICING_CATEGORIES.map(c => {
            const n = pricing.filter(p => p.category === c).length
            if (!n) return null
            return (
              <div key={c} className={'chip' + (filterCategory === c ? ' active' : '')}
                   onClick={() => setFilterCategory(c)}>{c} ({n})</div>
            )
          })}
        </div>
      </div>

      {stats && (
        <div className="pricing-stats">
          <div><span className="stat-lbl">Entries</span> <span className="stat-val">{stats.count}</span></div>
          <div><span className="stat-lbl">Median</span> <span className="stat-val">${stats.median.toFixed(2)}</span></div>
          <div><span className="stat-lbl">Mean</span> <span className="stat-val">${stats.mean.toFixed(2)}</span></div>
          <div><span className="stat-lbl">Min</span> <span className="stat-val">${stats.min.toFixed(2)}</span></div>
          <div><span className="stat-lbl">Max</span> <span className="stat-val">${stats.max.toFixed(2)}</span></div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-page">
          <p>No pricing entries yet. Add one to start building your database.</p>
        </div>
      ) : (
        <div className="data-table pricing-table">
          <div className="dt-head">
            <div>Description</div>
            <div>Category</div>
            <div>Unit</div>
            <div>Unit Price</div>
            <div>Region</div>
            <div>Date</div>
            <div>Sub</div>
            <div></div>
          </div>
          {filtered.map(p => {
            const sub = subs.find(s => s.id === p.subId)
            const anom = isPricingAnomaly(p, pricing)
            return (
              <div key={p.id} className={'dt-row' + (anom ? ' anomaly' : '')}>
                <div><div className="dt-primary">{p.description}</div></div>
                <div>{p.category}</div>
                <div>{p.unit}</div>
                <div style={{ fontWeight: 600 }}>${(+p.unitPrice).toFixed(2)}</div>
                <div>{p.region || '—'}</div>
                <div>{p.date || '—'}</div>
                <div>{sub?.companyName || '—'}</div>
                <div>
                  {anom && <span className="anomaly-badge">⚠ ANOMALY</span>}
                  <button className="btn secondary btn-sm" style={{ marginLeft: 6 }}
                          onClick={() => del(p.id)}>×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew && <PricingModal subs={subs} projects={projects} onClose={() => setShowNew(false)} onCreate={create} />}
    </div>
  )
}

const EMPTY = {
  description: '', category: 'Bollards', unit: 'EA',
  quantity: '', unitPrice: '', totalPrice: '',
  region: '', date: new Date().toISOString().slice(0,10),
  subId: '', projectId: ''
}

function PricingModal({ subs, projects, onClose, onCreate }) {
  const [f, setF] = useState(EMPTY)
  const set = (k, v) => {
    setF(prev => {
      const n = { ...prev, [k]: v }
      if (k === 'quantity' || k === 'unitPrice') {
        const q = parseFloat(n.quantity)
        const p = parseFloat(n.unitPrice)
        if (!isNaN(q) && !isNaN(p)) n.totalPrice = (q * p).toFixed(2)
      }
      return n
    })
  }

  const submit = () => {
    if (!f.description.trim()) return alert('Description required')
    if (!f.unitPrice || isNaN(+f.unitPrice)) return alert('Unit price required')
    onCreate(f)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Pricing Entry</div>
          <button className="close-btn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body">
          <div className="field"><label>Description *</label>
            <input value={f.description} onChange={e => set('description', e.target.value)}
                   placeholder="e.g. Steel bollard 6' with concrete footing" autoFocus /></div>
          <div className="field-row">
            <div className="field"><label>Category</label>
              <select value={f.category} onChange={e => set('category', e.target.value)}>
                {PRICING_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div className="field"><label>Unit</label>
              <select value={f.unit} onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Quantity</label>
              <input type="number" value={f.quantity} onChange={e => set('quantity', e.target.value)} /></div>
            <div className="field"><label>Unit Price *</label>
              <input type="number" step="0.01" value={f.unitPrice} onChange={e => set('unitPrice', e.target.value)} /></div>
            <div className="field"><label>Total</label>
              <input value={f.totalPrice} readOnly style={{ background: 'var(--hpp-light-gray)' }} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Region (State)</label>
              <input value={f.region} onChange={e => set('region', e.target.value.toUpperCase().slice(0,2))} maxLength="2" /></div>
            <div className="field"><label>Date</label>
              <input type="date" value={f.date} onChange={e => set('date', e.target.value)} /></div>
          </div>
          <div className="field"><label>Subcontractor</label>
            <select value={f.subId} onChange={e => set('subId', e.target.value)}>
              <option value="">—</option>
              {subs.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
            </select></div>
          {projects.length > 0 && (
            <div className="field"><label>Related Project (optional)</label>
              <select value={f.projectId} onChange={e => set('projectId', e.target.value)}>
                <option value="">—</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit}>Add Entry</button>
        </div>
      </div>
    </div>
  )
}
