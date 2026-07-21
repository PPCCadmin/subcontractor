import React, { useState } from 'react'
import { STATUSES } from '../data.js'
import { CloseIcon } from './icons.jsx'
import { buildSub, findDuplicate } from '../lib/subUtils.js'

const EMPTY = {
  companyName: '', address: '', city: '', state: '', zip: '',
  phone: '', cellPhone: '', email: '', contactName: '', position: '',
  contactName2: '', position2: '', cellPhone2: '', email2: '',
  website: '', servicesRaw: '', notes: '',
  status: 'New', w9OnFile: false, coiOnFile: false,
}

export default function AddSubModal({ existingSubs, onClose, onCreate }) {
  const [f, setF] = useState(EMPTY)
  const [dupeWarn, setDupeWarn] = useState(null)

  const set = (key, value) => setF(prev => ({ ...prev, [key]: value }))

  const check = () => {
    if (!f.companyName.trim()) return
    setDupeWarn(findDuplicate(existingSubs, f))
  }

  const submit = (force = false) => {
    if (!f.companyName.trim()) { alert('Company name is required.'); return }
    const duplicate = findDuplicate(existingSubs, f)
    if (duplicate && !force) { setDupeWarn(duplicate); return }
    onCreate(buildSub(f))
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Subcontractor</div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Company Name *</label>
            <input value={f.companyName} onChange={e => set('companyName', e.target.value)} onBlur={check} autoFocus />
          </div>

          {dupeWarn && (
            <div className="dupe-warning">
              <strong>Possible duplicate:</strong> {dupeWarn.companyName}
              {(dupeWarn.city || dupeWarn.state) && (
                <> ({dupeWarn.city || 'Unknown city'}, {dupeWarn.state || 'Unknown state'})</>
              )}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button type="button" className="btn secondary" onClick={() => setDupeWarn(null)}>
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
            <div className="field"><label>City</label>
              <input value={f.city} onChange={e => set('city', e.target.value)} onBlur={check} /></div>
            <div className="field"><label>State</label>
              <input value={f.state} onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))}
                     onBlur={check} maxLength={2} placeholder="WI" /></div>
            <div className="field"><label>Zip</label>
              <input value={f.zip} onChange={e => set('zip', e.target.value)} /></div>
          </div>

          <div className="field">
            <label>Business Phone</label>
            <input value={f.phone} onChange={e => set('phone', e.target.value)} onBlur={check} />
          </div>

          <div className="field">
            <label>Website</label>
            <input value={f.website} onChange={e => set('website', e.target.value)} />
          </div>

          <h4 style={{ margin: '16px 0 6px', fontSize: 13, color: 'var(--muted)', letterSpacing: 0.5 }}>
            PRIMARY CONTACT
          </h4>
          <div className="field-row">
            <div className="field"><label>Contact Name #1</label>
              <input value={f.contactName} onChange={e => set('contactName', e.target.value)} /></div>
            <div className="field"><label>Position #1</label>
              <input value={f.position} onChange={e => set('position', e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Cell #1</label>
              <input value={f.cellPhone} onChange={e => set('cellPhone', e.target.value)} /></div>
            <div className="field"><label>Email #1</label>
              <input type="email" value={f.email} onChange={e => set('email', e.target.value)} /></div>
          </div>

          <h4 style={{ margin: '16px 0 6px', fontSize: 13, color: 'var(--muted)', letterSpacing: 0.5 }}>
            SECONDARY CONTACT
          </h4>
          <div className="field-row">
            <div className="field"><label>Contact Name #2</label>
              <input value={f.contactName2} onChange={e => set('contactName2', e.target.value)} /></div>
            <div className="field"><label>Position #2</label>
              <input value={f.position2} onChange={e => set('position2', e.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Cell #2</label>
              <input value={f.cellPhone2} onChange={e => set('cellPhone2', e.target.value)} /></div>
            <div className="field"><label>Email #2</label>
              <input type="email" value={f.email2} onChange={e => set('email2', e.target.value)} /></div>
          </div>

          <div className="field">
            <label>Services (comma-separated)</label>
            <input value={f.servicesRaw} onChange={e => set('servicesRaw', e.target.value)}
                   placeholder="Asphalt, Sealcoat, Striping" />
          </div>

          <div className="field">
            <label>Status</label>
            <select value={f.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <h4 style={{ margin: '16px 0 6px', fontSize: 13, color: 'var(--muted)', letterSpacing: 0.5 }}>
            COMPLIANCE
          </h4>
          <div className="field-row">
            <div className="field"><label>W-9 on File</label>
              <select value={f.w9OnFile ? 'yes' : 'no'} onChange={e => set('w9OnFile', e.target.value === 'yes')}>
                <option value="no">No</option><option value="yes">Yes</option>
              </select></div>
            <div className="field"><label>COI on File</label>
              <select value={f.coiOnFile ? 'yes' : 'no'} onChange={e => set('coiOnFile', e.target.value === 'yes')}>
                <option value="no">No</option><option value="yes">Yes</option>
              </select></div>
          </div>

          <div className="field">
            <label>Notes</label>
            <textarea value={f.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={() => submit(Boolean(dupeWarn))}>
            {dupeWarn ? 'Add Anyway' : 'Add Subcontractor'}
          </button>
        </div>
      </div>
    </div>
  )
}