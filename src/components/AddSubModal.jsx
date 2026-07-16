import React, { useState } from 'react'
import { STATUSES } from '../data.js'
import { CloseIcon } from './icons.jsx'
import { buildSub, findDuplicate } from '../lib/subUtils.js'

const EMPTY = {
  companyName: '', address: '', city: '', state: '', zip: '',
  phone: '', cellPhone: '', email: '', contactName: '', position: '',
  website: '', servicesRaw: '', notes: '', status: 'New'
}

export default function AddSubModal({ existingSubs, onClose, onCreate }) {
  const [f, setF] = useState(EMPTY)
  const [dupeWarn, setDupeWarn] = useState(null)
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const check = () => {
    if (!f.companyName.trim()) return
    const dup = findDuplicate(existingSubs, f)
    setDupeWarn(dup)
  }

  const submit = (force = false) => {
    if (!f.companyName.trim()) {
      alert('Company name is required.')
      return
    }
    const dup = findDuplicate(existingSubs, f)
    if (dup && !force) {
      setDupeWarn(dup)
      return
    }
    onCreate(buildSub(f))
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Subcontractor</div>
          <button className="close-btn" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Company Name *</label>
            <input
              value={f.companyName}
              onChange={e => set('companyName', e.target.value)}
              onBlur={check}
              autoFocus
            />
          </div>

          {dupeWarn && (
            <div className="dupe-warning">
              <strong>Possible duplicate:</strong> {dupeWarn.companyName} ({dupeWarn.city}, {dupeWarn.state})
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button className="btn secondary" onClick={() => setDupeWarn(null)}>
                  Add anyway
                </button>
              </div>
            </div>
          )}

          <div className="field">
            <label>Address</label>
            <input value={f.address} onChange={e => set('address', e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>City</label>
              <input value={f.city} onChange={e => set('city', e.target.value)} onBlur={check} />
            </div>
            <div className="field">
              <label>State</label>
              <input
                value={f.state}
                onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))}
                onBlur={check}
                maxLength="2"
                placeholder="TX"
              />
            </div>
            <div className="field">
              <label>Zip</label>
              <input value={f.zip} onChange={e => set('zip', e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Phone</label>
              <input value={f.phone} onChange={e => set('phone', e.target.value)} onBlur={check} />
            </div>
            <div className="field">
              <label>Cell</label>
              <input value={f.cellPhone} onChange={e => set('cellPhone', e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Contact Name</label>
              <input value={f.contactName} onChange={e => set('contactName', e.target.value)} />
            </div>
            <div className="field">
              <label>Position</label>
              <input value={f.position} onChange={e => set('position', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Email</label>
            <input type="email" value={f.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div className="field">
            <label>Website</label>
            <input value={f.website} onChange={e => set('website', e.target.value)} />
          </div>

          <div className="field">
            <label>Services (comma-separated)</label>
            <input
              value={f.servicesRaw}
              onChange={e => set('servicesRaw', e.target.value)}
              placeholder="Asphalt, Sealcoat, Striping"
            />
          </div>

          <div className="field">
            <label>Status</label>
            <select value={f.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Notes</label>
            <textarea value={f.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={() => submit(!!dupeWarn)}>
            {dupeWarn ? 'Add Anyway' : 'Add Subcontractor'}
          </button>
        </div>
      </div>
    </div>
  )
}