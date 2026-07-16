import React, { useState } from 'react'
import { CloseIcon } from './icons.jsx'

function Stars({ value, onChange, size = 18 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => onChange(value === n ? null : n)}
              style={{
                cursor: 'pointer', fontSize: size,
                color: (value || 0) >= n ? '#b45309' : '#e5e5e5',
                userSelect: 'none'
              }}>★</span>
      ))}
    </span>
  )
}

export default function ProjectsView({ projects, setProjects, subs }) {
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState(null)

  const create = (p) => {
    setProjects(prev => [{ ...p, id: crypto.randomUUID() }, ...prev])
    setShowNew(false)
  }
  const save = (p) => {
    setProjects(prev => prev.map(x => x.id === p.id ? p : x))
    setEditing(null)
  }
  const del = (id) => {
    if (confirm('Delete this project?')) setProjects(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Projects</h2>
          <p className="page-sub">Historical project record. Rate performance to inform future sourcing.</p>
        </div>
        <button className="btn" onClick={() => setShowNew(true)}>+ Add Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-page">
          <p>No projects yet. Click "Add Project" to record one.</p>
        </div>
      ) : (
        <div className="data-table proj-table">
          <div className="dt-head">
            <div>Project</div>
            <div>Subcontractor</div>
            <div>Location</div>
            <div>Contract Value</div>
            <div>Completed</div>
            <div>Rating</div>
            <div></div>
          </div>
          {projects.map(p => {
            const sub = subs.find(s => s.id === p.subId)
            const r = p.rating || {}
            const vals = [r.quality, r.schedule, r.safety, r.communication].filter(v => v != null)
            const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—'
            return (
              <div key={p.id} className="dt-row" onClick={() => setEditing(p)}>
                <div><div className="dt-primary">{p.name}</div></div>
                <div>{sub?.companyName || 'Unknown'}</div>
                <div>{[p.city, p.state].filter(Boolean).join(', ') || '—'}</div>
                <div>{p.contractValue ? `$${(+p.contractValue).toLocaleString()}` : '—'}</div>
                <div>{p.completionDate || '—'}</div>
                <div><strong>{avg}</strong> {avg !== '—' && <span style={{color:'#b45309'}}>★</span>}</div>
                <div></div>
              </div>
            )
          })}
        </div>
      )}

      {showNew && <ProjectModal subs={subs} onClose={() => setShowNew(false)} onSave={create} />}
      {editing && <ProjectModal subs={subs} project={editing} onClose={() => setEditing(null)}
                                 onSave={save} onDelete={() => { del(editing.id); setEditing(null); }} />}
    </div>
  )
}

const EMPTY = { name: '', subId: '', address: '', city: '', state: '',
                contractValue: '', startDate: '', completionDate: '', scope: '',
                rating: { quality: null, schedule: null, safety: null, communication: null } }

function ProjectModal({ subs, project, onClose, onSave, onDelete }) {
  const [f, setF] = useState(project || EMPTY)
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  const setRating = (k, v) => setF(prev => ({ ...prev, rating: { ...prev.rating, [k]: v } }))

  const submit = () => {
    if (!f.name.trim()) return alert('Project name required')
    if (!f.subId) return alert('Select subcontractor')
    onSave(f)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{project ? 'Edit Project' : 'Add Project'}</div>
          <button className="close-btn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body">
          <div className="field"><label>Project Name *</label>
            <input value={f.name} onChange={e => set('name', e.target.value)} autoFocus /></div>
          <div className="field"><label>Subcontractor *</label>
            <select value={f.subId} onChange={e => set('subId', e.target.value)}>
              <option value="">— select —</option>
              {subs.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
            </select></div>
          <div className="field"><label>Address</label>
            <input value={f.address} onChange={e => set('address', e.target.value)} /></div>
          <div className="field-row">
            <div className="field"><label>City</label>
              <input value={f.city} onChange={e => set('city', e.target.value)} /></div>
            <div className="field"><label>State</label>
              <input value={f.state} onChange={e => set('state', e.target.value.toUpperCase().slice(0,2))} maxLength="2" /></div>
            <div className="field"><label>Contract Value</label>
              <input type="number" value={f.contractValue} onChange={e => set('contractValue', e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Start Date</label>
              <input type="date" value={f.startDate} onChange={e => set('startDate', e.target.value)} /></div>
            <div className="field"><label>Completion Date</label>
              <input type="date" value={f.completionDate} onChange={e => set('completionDate', e.target.value)} /></div>
          </div>
          <div className="field"><label>Scope</label>
            <textarea value={f.scope} onChange={e => set('scope', e.target.value)} /></div>

          <div style={{ marginTop: 16, padding: 12, background: 'var(--hpp-light-gray)', borderRadius: 6 }}>
            <div className="filter-label">Performance Ratings</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
              <div>Work Quality</div>       <Stars value={f.rating.quality}       onChange={v => setRating('quality', v)} />
              <div>Schedule Adherence</div> <Stars value={f.rating.schedule}      onChange={v => setRating('schedule', v)} />
              <div>Safety Performance</div> <Stars value={f.rating.safety}        onChange={v => setRating('safety', v)} />
              <div>Communication</div>      <Stars value={f.rating.communication} onChange={v => setRating('communication', v)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {onDelete && <button className="btn secondary" style={{ color: '#dc2626', borderColor: '#dc2626', marginRight: 'auto' }} onClick={onDelete}>Delete</button>}
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit}>{project ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  )
}
