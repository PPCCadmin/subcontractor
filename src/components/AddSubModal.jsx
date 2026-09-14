import React, { useState } from 'react'
import { STATUSES } from '../data.js'
import { CloseIcon } from './icons.jsx'
import { buildSub, findDuplicate } from '../lib/subUtils.js'

const EMPTY = {
  companyName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  cellPhone: '',
  email: '',
  contactName: '',
  position: '',
  contactName2: '',
  position2: '',
  cellPhone2: '',
  email2: '',
  website: '',
  servicesRaw: '',
  notes: '',
  status: 'New',
  w9OnFile: false,
}

export default function AddSubModal({ existingSubs, onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY)
  const [duplicate, setDuplicate] = useState(null)
  const set = (key, value) => setForm(previous => ({ ...previous, [key]: value }))

  const checkDuplicate = () => {
    if (form.companyName.trim()) setDuplicate(findDuplicate(existingSubs, form))
  }

  const submit = force => {
    if (!form.companyName.trim()) return alert('Company name is required.')
    const match = findDuplicate(existingSubs, form)
    if (match && !force) return setDuplicate(match)
    onCreate(buildSub(form))
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Subcontractor</div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <div className="modal-body">
          <div className="field"><label>Company Name *</label><input value={form.companyName} onChange={event => set('companyName', event.target.value)} onBlur={checkDuplicate} autoFocus /></div>

          {duplicate && (
            <div className="dupe-warning">
              <strong>Possible duplicate:</strong> {duplicate.companyName}
              {(duplicate.city || duplicate.state) && <> ({duplicate.city || 'Unknown city'}, {duplicate.state || 'Unknown state'})</>}
            </div>
          )}

          <div className="field"><label>Address</label><input value={form.address} onChange={event => set('address', event.target.value)} /></div>
          <div className="field-row field-row-three">
            <div className="field"><label>City</label><input value={form.city} onChange={event => set('city', event.target.value)} onBlur={checkDuplicate} /></div>
            <div className="field"><label>State</label><input value={form.state} onChange={event => set('state', event.target.value.toUpperCase().slice(0, 2))} maxLength="2" /></div>
            <div className="field"><label>ZIP</label><input value={form.zip} onChange={event => set('zip', event.target.value)} /></div>
          </div>
          <div className="field"><label>Business Phone</label><input value={form.phone} onChange={event => set('phone', event.target.value)} /></div>
          <div className="field"><label>Website</label><input value={form.website} onChange={event => set('website', event.target.value)} /></div>

          <h4 className="form-section-title">Primary Contact</h4>
          <div className="field-row">
            <div className="field"><label>Name</label><input value={form.contactName} onChange={event => set('contactName', event.target.value)} /></div>
            <div className="field"><label>Position</label><input value={form.position} onChange={event => set('position', event.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Cell</label><input value={form.cellPhone} onChange={event => set('cellPhone', event.target.value)} /></div>
            <div className="field"><label>Email</label><input type="email" value={form.email} onChange={event => set('email', event.target.value)} /></div>
          </div>

          <h4 className="form-section-title">Secondary Contact</h4>
          <div className="field-row">
            <div className="field"><label>Name</label><input value={form.contactName2} onChange={event => set('contactName2', event.target.value)} /></div>
            <div className="field"><label>Position</label><input value={form.position2} onChange={event => set('position2', event.target.value)} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Cell</label><input value={form.cellPhone2} onChange={event => set('cellPhone2', event.target.value)} /></div>
            <div className="field"><label>Email</label><input type="email" value={form.email2} onChange={event => set('email2', event.target.value)} /></div>
          </div>

          <div className="field"><label>Services</label><input value={form.servicesRaw} onChange={event => set('servicesRaw', event.target.value)} placeholder="Asphalt, Sealcoat, Striping" /></div>
          <div className="field"><label>Status</label><select value={form.status} onChange={event => set('status', event.target.value)}>{STATUSES.map(status => <option key={status.key} value={status.key}>{status.label}</option>)}</select></div>
          <div className="field"><label>W-9 on File</label><select value={form.w9OnFile ? 'yes' : 'no'} onChange={event => set('w9OnFile', event.target.value === 'yes')}><option value="no">No</option><option value="yes">Yes</option></select></div>
          <div className="field"><label>Notes</label><textarea value={form.notes} onChange={event => set('notes', event.target.value)} /></div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={() => submit(Boolean(duplicate))}>{duplicate ? 'Add Anyway' : 'Add Subcontractor'}</button>
        </div>
      </div>
    </div>
  )
}
