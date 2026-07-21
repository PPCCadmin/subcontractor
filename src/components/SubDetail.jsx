import React, { useState, useRef } from 'react'
import {
  BUSINESS_STRUCTURES, CONTACT_ROLES, PROJECT_SCALES,
  EQUIPMENT_TYPES, LICENSE_TYPES, ATTACHMENT_TYPES,
  SERVICE_TAXONOMY, STATUSES
} from '../data.js'
import { CloseIcon, TrashIcon, UploadIcon, DownloadIcon, PhoneIcon, PlusIcon, WarningIcon } from './icons.jsx'
import { subHitRate, daysUntil } from '../lib/metrics.js'
import * as turf from '@turf/turf'

const TABS = ['Info', 'Contacts', 'Equipment', 'Licenses', 'Files', 'Metrics']

export default function SubDetail({ sub, jobLocation, rfqs = [], projects = [], onClose, onChange }) {
  const [tab, setTab] = useState('Info')
  if (!sub) return null

  const patch = (p) => onChange({ ...sub, ...p })

  let distance = null
  if (jobLocation && sub.lat != null && sub.lng != null) {
    distance = turf.distance(
      turf.point([jobLocation.lng, jobLocation.lat]),
      turf.point([sub.lng, sub.lat]), { units: 'miles' })
  }
  const statusKey = (sub.status || 'New').replace(/\s+/g, '')

  return (
    <div className="detail">
      <div className="detail-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="detail-title">{sub.companyName}</div>
          <div className="detail-address">
            {[sub.address, sub.city, sub.state, sub.zip].filter(Boolean).join(', ')}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={'pill pill-' + statusKey}>{sub.status || 'New'}</span>
            {distance != null && (
              <span className="pill pill-distance">{distance.toFixed(0)} mi from job</span>
            )}
          </div>
        </div>
        <button className="close-btn" onClick={onClose}><CloseIcon /></button>
      </div>

      <div className="detail-tabs">
        {TABS.map(t => (
          <button key={t}
                  className={'detail-tab' + (tab === t ? ' active' : '')}
                  onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="detail-body">
        {tab === 'Info'      && <InfoTab sub={sub} patch={patch} />}
        {tab === 'Contacts'  && <ContactsTab sub={sub} patch={patch} />}
        {tab === 'Equipment' && <EquipmentTab sub={sub} patch={patch} />}
        {tab === 'Licenses'  && <LicensesTab sub={sub} patch={patch} />}
        {tab === 'Files'     && <FilesTab sub={sub} patch={patch} />}
        {tab === 'Metrics'   && <MetricsTab sub={sub} rfqs={rfqs} projects={projects} />}
      </div>
    </div>
  )
}

function InfoTab({ sub, patch }) {
  const toggleService = (svc) => {
    const has = sub.canonicalServices?.includes(svc)
    patch({
      canonicalServices: has
        ? sub.canonicalServices.filter(s => s !== svc)
        : [...(sub.canonicalServices || []), svc]
    })
  }
  const toggleScale = (scale) => {
    const has = sub.projectScales?.includes(scale)
    patch({
      projectScales: has
        ? sub.projectScales.filter(s => s !== scale)
        : [...(sub.projectScales || []), scale]
    })
  }
  return (
    <>
      <div className="detail-section">
        <h4>Overview</h4>
        <div className="field-row">
          <div className="field">
            <label>Status</label>
            <select value={sub.status || ''} onChange={e => patch({ status: e.target.value })}>
              <option value="">—</option>
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Business Structure</label>
            <select value={sub.businessStructure || ''} onChange={e => patch({ businessStructure: e.target.value || null })}>
              <option value="">—</option>
              {BUSINESS_STRUCTURES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4>Primary Contact</h4>
        <div className="field-row">
          <div className="field">
            <label>Contact Name</label>
            <input value={sub.contactName || ''} onChange={e => patch({ contactName: e.target.value || null })} />
          </div>
          <div className="field">
            <label>Position</label>
            <input value={sub.position || ''} onChange={e => patch({ position: e.target.value || null })} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Phone (Business)</label>
            <input value={sub.phone || ''} onChange={e => patch({ phone: e.target.value || null })} />
          </div>
          <div className="field">
            <label>Cell</label>
            <input value={sub.cellPhone || ''} onChange={e => patch({ cellPhone: e.target.value || null })} />
          </div>
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={sub.email || ''} onChange={e => patch({ email: e.target.value || null })} />
        </div>
        <div className="field">
          <label>Website</label>
          <input value={sub.website || ''} onChange={e => patch({ website: e.target.value || null })} />
        </div>
      </div>

      <div className="detail-section">
        <h4>Secondary Contact</h4>
        <div className="field-row">
          <div className="field">
            <label>Contact Name #2</label>
            <input value={sub.contactName2 || ''} onChange={e => patch({ contactName2: e.target.value || null })} />
          </div>
          <div className="field">
            <label>Position #2</label>
            <input value={sub.position2 || ''} onChange={e => patch({ position2: e.target.value || null })} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Cell #2</label>
            <input value={sub.cellPhone2 || ''} onChange={e => patch({ cellPhone2: e.target.value || null })} />
          </div>
          <div className="field">
            <label>Email #2</label>
            <input type="email" value={sub.email2 || ''} onChange={e => patch({ email2: e.target.value || null })} />
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4>Services</h4>
        <div className="chips">
          {SERVICE_TAXONOMY.map(s => (
            <div key={s}
                 className={'chip' + ((sub.canonicalServices || []).includes(s) ? ' active' : '')}
                 onClick={() => toggleService(s)}>{s}</div>
          ))}
        </div>
        {sub.servicesRaw && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
            Original: {sub.servicesRaw}
          </div>
        )}
      </div>

      <div className="detail-section">
        <h4>Project Scales</h4>
        <div className="chips">
          {PROJECT_SCALES.map(p => (
            <div key={p}
                 className={'chip' + ((sub.projectScales || []).includes(p) ? ' active' : '')}
                 onClick={() => toggleScale(p)}>{p}</div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h4>Vetting</h4>
        <div className="field-row">
          <div className="field">
            <label>MSA on File</label>
            <select value={sub.msaStatus ? 'yes' : 'no'} onChange={e => patch({ msaStatus: e.target.value === 'yes' })}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </div>
          <div className="field">
            <label>MSA Effective Date</label>
            <input type="date" value={sub.msaEffectiveDate || ''}
                   onChange={e => patch({ msaEffectiveDate: e.target.value || null })} />
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4>Compliance</h4>
        <div className="field-row">
          <div className="field">
            <label>W-9 on File</label>
            <select value={sub.w9OnFile ? 'yes' : 'no'} onChange={e => patch({ w9OnFile: e.target.value === 'yes' })}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </div>
          <div className="field">
            <label>COI on File</label>
            <select value={sub.coiOnFile ? 'yes' : 'no'} onChange={e => patch({ coiOnFile: e.target.value === 'yes' })}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>COI — GL Exp.</label>
            <input type="date" value={sub.coiGL || ''} onChange={e => patch({ coiGL: e.target.value || null })} />
          </div>
          <div className="field">
            <label>COI — Auto Exp.</label>
            <input type="date" value={sub.coiAuto || ''} onChange={e => patch({ coiAuto: e.target.value || null })} />
          </div>
        </div>
        <div className="field">
          <label>COI — Work Comp Exp.</label>
          <input type="date" value={sub.coiWC || ''} onChange={e => patch({ coiWC: e.target.value || null })} />
        </div>
      </div>

      <div className="detail-section">
        <h4>Notes</h4>
        <div className="field">
          <textarea value={sub.notes || ''} onChange={e => patch({ notes: e.target.value })}
                    placeholder="Relationship context, travel exceptions, strengths/weaknesses, vetting insights..." />
        </div>
      </div>
    </>
  )
}

function ContactsTab({ sub, patch }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', role: 'Estimator', phone: '', cellPhone: '', email: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const contacts = sub.contacts || []

  const add = () => {
    if (!form.name.trim()) return alert('Name required')
    patch({ contacts: [...contacts, { id: crypto.randomUUID(), ...form }] })
    setForm({ name: '', role: 'Estimator', phone: '', cellPhone: '', email: '' })
    setAdding(false)
  }
  const remove = (id) => patch({ contacts: contacts.filter(c => c.id !== id) })

  return (
    <div className="detail-section">
      <h4>Contacts ({contacts.length})</h4>
      {contacts.map(c => (
        <div key={c.id} className="list-item">
          <div style={{ flex: 1 }}>
            <div className="li-name"><strong>{c.name}</strong> <span className="mini-chip">{c.role}</span></div>
            {c.phone && <div className="li-meta"><PhoneIcon /> {c.phone}</div>}
            {c.cellPhone && <div className="li-meta"><PhoneIcon /> {c.cellPhone} (cell)</div>}
            {c.email && <div className="li-meta">{c.email}</div>}
          </div>
          <button className="icon-only-btn" onClick={() => remove(c.id)} title="Delete"><TrashIcon /></button>
        </div>
      ))}
      {adding ? (
        <div className="inline-form">
          <div className="field-row">
            <div className="field"><label>Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} autoFocus /></div>
            <div className="field"><label>Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="field"><label>Cell</label>
              <input value={form.cellPhone} onChange={e => set('cellPhone', e.target.value)} /></div>
          </div>
          <div className="field"><label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={add}>Save</button>
            <button className="btn secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn secondary" onClick={() => setAdding(true)} style={{ marginTop: 8 }}>
          <PlusIcon /> Add Contact
        </button>
      )}
    </div>
  )
}

function EquipmentTab({ sub, patch }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: 'Paver', count: 1, ownership: 'Owned' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const equipment = sub.equipment || []

  const add = () => {
    patch({ equipment: [...equipment, { id: crypto.randomUUID(), ...form, count: +form.count }] })
    setForm({ type: 'Paver', count: 1, ownership: 'Owned' })
    setAdding(false)
  }
  const remove = (id) => patch({ equipment: equipment.filter(e => e.id !== id) })

  return (
    <div className="detail-section">
      <h4>Equipment ({equipment.length})</h4>
      {equipment.map(e => (
        <div key={e.id} className="list-item">
          <div style={{ flex: 1 }}>
            <div className="li-name">
              <strong>{e.type}</strong>
              <span className="mini-chip">×{e.count}</span>
              <span className={'mini-chip ' + (e.ownership === 'Owned' ? 'chip-owned' : 'chip-rented')}>{e.ownership}</span>
            </div>
          </div>
          <button className="icon-only-btn" onClick={() => remove(e.id)}><TrashIcon /></button>
        </div>
      ))}
      {adding ? (
        <div className="inline-form">
          <div className="field-row">
            <div className="field"><label>Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div className="field"><label>Count</label>
              <input type="number" min="1" value={form.count} onChange={e => set('count', e.target.value)} /></div>
            <div className="field"><label>Ownership</label>
              <select value={form.ownership} onChange={e => set('ownership', e.target.value)}>
                <option>Owned</option><option>Rented</option>
              </select></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={add}>Save</button>
            <button className="btn secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn secondary" onClick={() => setAdding(true)} style={{ marginTop: 8 }}>
          <PlusIcon /> Add Equipment
        </button>
      )}
    </div>
  )
}

function LicensesTab({ sub, patch }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: 'General Contractor', number: '', state: '', expiration: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const licenses = sub.licenses || []

  const add = () => {
    if (!form.number.trim()) return alert('License number required')
    patch({ licenses: [...licenses, { id: crypto.randomUUID(), ...form }] })
    setForm({ type: 'General Contractor', number: '', state: '', expiration: '' })
    setAdding(false)
  }
  const remove = (id) => patch({ licenses: licenses.filter(l => l.id !== id) })

  return (
    <div className="detail-section">
      <h4>Licenses ({licenses.length})</h4>
      {licenses.map(l => {
        const days = daysUntil(l.expiration)
        const badge = days === null ? null
          : days < 0    ? { cls: 'chip-expired', txt: `Expired ${Math.abs(days)}d ago` }
          : days <= 30  ? { cls: 'chip-expiring', txt: `${days}d left` }
          : { cls: '', txt: `${days}d left` }
        return (
          <div key={l.id} className="list-item">
            <div style={{ flex: 1 }}>
              <div className="li-name">
                <strong>{l.type}</strong>
                {l.state && <span className="mini-chip">{l.state}</span>}
                {badge && <span className={'mini-chip ' + badge.cls}>{badge.txt}</span>}
              </div>
              <div className="li-meta">#{l.number}{l.expiration && ` · expires ${l.expiration}`}</div>
            </div>
            <button className="icon-only-btn" onClick={() => remove(l.id)}><TrashIcon /></button>
          </div>
        )
      })}
      {adding ? (
        <div className="inline-form">
          <div className="field"><label>Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              {LICENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div className="field-row">
            <div className="field"><label>License #</label>
              <input value={form.number} onChange={e => set('number', e.target.value)} /></div>
            <div className="field"><label>State</label>
              <input value={form.state} onChange={e => set('state', e.target.value.toUpperCase().slice(0,2))} maxLength="2" /></div>
            <div className="field"><label>Expiration</label>
              <input type="date" value={form.expiration} onChange={e => set('expiration', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={add}>Save</button>
            <button className="btn secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn secondary" onClick={() => setAdding(true)} style={{ marginTop: 8 }}>
          <PlusIcon /> Add License
        </button>
      )}
    </div>
  )
}

function FilesTab({ sub, patch }) {
  const inputRef = useRef(null)
  const [pending, setPending] = useState(null)
  const attachments = sub.attachments || []
  const totalKB = attachments.reduce((sum, a) => sum + (a.size || 0), 0) / 1024
  const overLimit = totalKB > 5120

  const onFilePick = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPending({
        id: crypto.randomUUID(),
        type: 'COI',
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        dataBase64: ev.target.result,
        uploadedAt: new Date().toISOString()
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  const savePending = () => {
    patch({ attachments: [...attachments, pending] })
    setPending(null)
  }
  const remove = (id) => {
    if (confirm('Delete this file?')) patch({ attachments: attachments.filter(a => a.id !== id) })
  }
  const download = (a) => {
    const link = document.createElement('a')
    link.href = a.dataBase64
    link.download = a.filename
    link.click()
  }

  return (
    <div className="detail-section">
      <h4>Files ({attachments.length}) · {totalKB.toFixed(0)} KB</h4>
      {overLimit && (
        <div className="banner banner-warn" style={{ margin: '0 0 12px' }}>
          <WarningIcon /> Attachments exceed 5MB — consider deleting old files to keep browser storage healthy.
        </div>
      )}
      {attachments.map(a => (
        <div key={a.id} className="list-item">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="li-name">
              <span className={'mini-chip chip-file-' + a.type.replace(/[\s-]+/g,'')}>{a.type}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</span>
            </div>
            <div className="li-meta">
              {(a.size / 1024).toFixed(1)} KB · uploaded {a.uploadedAt.slice(0, 10)}
            </div>
          </div>
          <button className="icon-only-btn" onClick={() => download(a)} title="Download"><DownloadIcon /></button>
          <button className="icon-only-btn" onClick={() => remove(a.id)} title="Delete"><TrashIcon /></button>
        </div>
      ))}
      {pending && (
        <div className="inline-form">
          <div className="li-name" style={{ marginBottom: 8 }}>
            <strong>{pending.filename}</strong>
            <span className="mini-chip">{(pending.size / 1024).toFixed(1)} KB</span>
          </div>
          <div className="field">
            <label>Document Type</label>
            <select value={pending.type} onChange={e => setPending({ ...pending, type: e.target.value })}>
              {ATTACHMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={savePending}>Attach</button>
            <button className="btn secondary" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={onFilePick}
             accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" />
      {!pending && (
        <button className="btn secondary" onClick={() => inputRef.current?.click()} style={{ marginTop: 8 }}>
          <UploadIcon /> Upload File
        </button>
      )}
    </div>
  )
}

function MetricsTab({ sub, rfqs, projects }) {
  const hr = subHitRate(sub.id, rfqs)
  const subProjects = projects.filter(p => p.subId === sub.id)
    .sort((a,b) => (b.completionDate || '').localeCompare(a.completionDate || ''))

  return (
    <>
      <div className="detail-section">
        <h4>Performance Metrics</h4>
        <div className="metric-grid">
          <div className="metric-tile">
            <div className="metric-num">{hr.invited}</div>
            <div className="metric-lbl">RFQ Invites</div>
          </div>
          <div className="metric-tile">
            <div className="metric-num">{hr.awarded}</div>
            <div className="metric-lbl">Awards</div>
          </div>
          <div className="metric-tile">
            <div className="metric-num">{hr.rate != null ? `${Math.round(hr.rate * 100)}%` : '—'}</div>
            <div className="metric-lbl">Hit Rate</div>
          </div>
          <div className="metric-tile">
            <div className="metric-num">{subProjects.length}</div>
            <div className="metric-lbl">Projects</div>
          </div>
        </div>
      </div>

      {subProjects.length > 0 && (
        <div className="detail-section">
          <h4>Recent Projects</h4>
          {subProjects.slice(0, 5).map(p => (
            <div key={p.id} className="list-item">
              <div style={{ flex: 1 }}>
                <div className="li-name"><strong>{p.name}</strong></div>
                <div className="li-meta">
                  {[p.city, p.state].filter(Boolean).join(', ')}
                  {p.completionDate && ` · completed ${p.completionDate}`}
                  {p.contractValue && ` · $${(+p.contractValue).toLocaleString()}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}