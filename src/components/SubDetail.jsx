import React, { useRef, useState } from 'react'
import {
  BUSINESS_STRUCTURES,
  CONTACT_ROLES,
  PROJECT_SCALES,
  EQUIPMENT_TYPES,
  LICENSE_TYPES,
  ATTACHMENT_TYPES,
  SERVICE_TAXONOMY,
  STATUSES,
} from '../data.js'
import { CloseIcon, TrashIcon, UploadIcon, DownloadIcon, PhoneIcon, PlusIcon, WarningIcon } from './icons.jsx'
import { daysUntil, ratingSummary } from '../lib/metrics.js'
import { StarDisplay, StarInput } from './Stars.jsx'
import * as turf from '@turf/turf'

const TABS = ['Info', 'Ratings', 'Contacts', 'Equipment', 'Licenses', 'Files', 'Metrics']

export default function SubDetail({ sub, jobLocation, projects = [], canEdit = false, user = null, saveState, onRate, onUnrate, onClose, onChange }) {
  const [tab, setTab] = useState('Info')
  if (!sub) return null

  const patch = changes => { if (canEdit) onChange({ ...sub, ...changes }) }
  const distance = jobLocation && sub.lat != null && sub.lng != null
    ? turf.distance(turf.point([jobLocation.lng, jobLocation.lat]), turf.point([sub.lng, sub.lat]), { units: 'miles' })
    : null
  const statusKey = (sub.status || 'New').replace(/\s+/g, '')
  const rating = ratingSummary(sub)

  return (
    <div className="detail">
      <div className="detail-header">
        <div className="detail-heading-copy">
          <div className="detail-title">{sub.companyName}</div>
          <div className="detail-address">{[sub.address, sub.city, sub.state, sub.zip].filter(Boolean).join(', ')}</div>
          <div className="detail-pills">
            <span className={`pill pill-${statusKey}`}>{sub.status || 'New'}</span>
            {sub.locationAccuracy === 'approximate' && <span className="pill pill-approx">Approximate location</span>}
            {distance != null && <span className="pill pill-distance">{distance.toFixed(0)} mi from job</span>}
            {rating.count > 0 && (
              <button type="button" className="pill pill-rating" onClick={() => setTab('Ratings')} title="See ratings">
                <StarDisplay value={rating.average} size={12} /> {rating.average.toFixed(1)} ({rating.count})
              </button>
            )}
            {!canEdit && <span className="pill pill-readonly">Read only</span>}
            {canEdit && <SaveStatus state={saveState} />}
          </div>
        </div>
        <button className="close-btn" onClick={onClose}><CloseIcon /></button>
      </div>

      <div className="detail-tabs">
        {TABS.map(name => (
          <button key={name} className={`detail-tab${tab === name ? ' active' : ''}`} onClick={() => setTab(name)}>{name}</button>
        ))}
      </div>

      <div className="detail-body">
        {tab === 'Info' && <InfoTab sub={sub} patch={patch} canEdit={canEdit} />}
        {tab === 'Ratings' && <RatingsTab sub={sub} canEdit={canEdit} user={user} onRate={onRate} onUnrate={onUnrate} />}
        {tab === 'Contacts' && <ContactsTab sub={sub} patch={patch} canEdit={canEdit} />}
        {tab === 'Equipment' && <EquipmentTab sub={sub} patch={patch} canEdit={canEdit} />}
        {tab === 'Licenses' && <LicensesTab sub={sub} patch={patch} canEdit={canEdit} />}
        {tab === 'Files' && <FilesTab sub={sub} patch={patch} canEdit={canEdit} />}
        {tab === 'Metrics' && <MetricsTab sub={sub} projects={projects} />}
      </div>
    </div>
  )
}

function InfoTab({ sub, patch, canEdit }) {
  const toggleService = service => {
    const current = sub.canonicalServices || []
    patch({ canonicalServices: current.includes(service) ? current.filter(item => item !== service) : [...current, service] })
  }

  const toggleScale = scale => {
    const current = sub.projectScales || []
    patch({ projectScales: current.includes(scale) ? current.filter(item => item !== scale) : [...current, scale] })
  }

  return (
    <fieldset className="readonly-fieldset" disabled={!canEdit}>
      <Section title="Overview">
        <div className="field-row">
          <Field label="Status">
            <select value={sub.status || ''} onChange={event => patch({ status: event.target.value })}>
              <option value="">Select</option>
              {STATUSES.map(status => <option key={status.key} value={status.key}>{status.label}</option>)}
            </select>
          </Field>
          <Field label="Business Structure">
            <select value={sub.businessStructure || ''} onChange={event => patch({ businessStructure: event.target.value || null })}>
              <option value="">Select</option>
              {BUSINESS_STRUCTURES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Primary Contact">
        <div className="field-row">
          <Field label="Contact Name"><input value={sub.contactName || ''} onChange={event => patch({ contactName: event.target.value || null })} /></Field>
          <Field label="Position"><input value={sub.position || ''} onChange={event => patch({ position: event.target.value || null })} /></Field>
        </div>
        <div className="field-row">
          <Field label="Business Phone"><input value={sub.phone || ''} onChange={event => patch({ phone: event.target.value || null })} /></Field>
          <Field label="Cell"><input value={sub.cellPhone || ''} onChange={event => patch({ cellPhone: event.target.value || null })} /></Field>
        </div>
        <Field label="Email"><input type="email" value={sub.email || ''} onChange={event => patch({ email: event.target.value || null })} /></Field>
        <Field label="Website"><input value={sub.website || ''} onChange={event => patch({ website: event.target.value || null })} /></Field>
      </Section>

      <Section title="Secondary Contact">
        <div className="field-row">
          <Field label="Contact Name"><input value={sub.contactName2 || ''} onChange={event => patch({ contactName2: event.target.value || null })} /></Field>
          <Field label="Position"><input value={sub.position2 || ''} onChange={event => patch({ position2: event.target.value || null })} /></Field>
        </div>
        <div className="field-row">
          <Field label="Cell"><input value={sub.cellPhone2 || ''} onChange={event => patch({ cellPhone2: event.target.value || null })} /></Field>
          <Field label="Email"><input type="email" value={sub.email2 || ''} onChange={event => patch({ email2: event.target.value || null })} /></Field>
        </div>
      </Section>

      <Section title="Services">
        <div className="chips">
          {SERVICE_TAXONOMY.map(service => (
            <button type="button" key={service} className={`chip${(sub.canonicalServices || []).includes(service) ? ' active' : ''}`} onClick={() => toggleService(service)}>{service}</button>
          ))}
        </div>
        {sub.servicesRaw && <div className="original-services">Original: {sub.servicesRaw}</div>}
      </Section>

      <Section title="Project Scales">
        <div className="chips">
          {PROJECT_SCALES.map(scale => (
            <button type="button" key={scale} className={`chip${(sub.projectScales || []).includes(scale) ? ' active' : ''}`} onClick={() => toggleScale(scale)}>{scale}</button>
          ))}
        </div>
      </Section>

      <Section title="Vetting and Documentation">
        <div className="field-row">
          <Field label="MSA on File">
            <select value={sub.msaStatus ? 'yes' : 'no'} onChange={event => patch({ msaStatus: event.target.value === 'yes' })}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </Field>
          <Field label="MSA Effective Date"><input type="date" value={sub.msaEffectiveDate || ''} onChange={event => patch({ msaEffectiveDate: event.target.value || null })} /></Field>
        </div>
        <Field label="W-9 on File">
          <select value={sub.w9OnFile ? 'yes' : 'no'} onChange={event => patch({ w9OnFile: event.target.value === 'yes' })}>
            <option value="no">No</option><option value="yes">Yes</option>
          </select>
        </Field>
      </Section>

      <Section title="Notes">
        <Field label=""><textarea value={sub.notes || ''} onChange={event => patch({ notes: event.target.value })} placeholder="Relationship context, travel exceptions, strengths, weaknesses, and vetting notes" /></Field>
      </Section>
    </fieldset>
  )
}

function SaveStatus({ state }) {
  if (!state || state.status === 'idle') return null
  if (state.status === 'error') return <span className="save-status save-error" title={state.message}>Not saved: {state.message}</span>
  if (state.status === 'saved') return <span className="save-status">All changes saved</span>
  return <span className="save-status">Saving…</span>
}

function RatingsTab({ sub, canEdit, user, onRate, onUnrate }) {
  const ratings = sub.ratings || []
  const me = (user?.email || '').toLowerCase()
  const mine = ratings.find(item => item.byEmail === me)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ stars: 0, comment: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const summary = ratingSummary(sub)

  const run = async action => {
    setBusy(true)
    setError('')
    try {
      await action()
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const startEdit = () => {
    setForm({ stars: mine?.stars || 0, comment: mine?.comment || '' })
    setEditing(true)
  }

  const save = () => {
    if (!form.stars) return setError('Pick 1 to 5 stars.')
    run(() => onRate(sub.id, form.stars, form.comment.trim()))
  }

  const remove = () => run(() => onUnrate(sub.id))

  const sorted = [...ratings].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <>
      <Section title="Overall Rating">
        {summary.count ? (
          <div className="rating-summary">
            <div className="rating-big">{summary.average.toFixed(1)}</div>
            <div>
              <StarDisplay value={summary.average} size={20} />
              <div className="li-meta">Average of {summary.count} rating{summary.count === 1 ? '' : 's'}</div>
            </div>
          </div>
        ) : <div className="li-meta">No ratings yet.</div>}
      </Section>

      {canEdit && (
        <Section title="Your Rating">
          {editing ? (
            <div className="inline-form">
              <StarInput value={form.stars} onChange={stars => setForm(previous => ({ ...previous, stars }))} />
              <Field label="Why this rating?">
                <textarea value={form.comment} onChange={event => { const comment = event.target.value; setForm(previous => ({ ...previous, comment })) }} placeholder="Quality of work, schedule, communication, would you use them again?" />
              </Field>
              {error && <div className="form-error">{error}</div>}
              <FormButtons onSave={save} onCancel={() => setEditing(false)} disabled={busy} />
            </div>
          ) : mine ? (
            <div className="list-item">
              <div className="list-item-content">
                <div className="li-name"><StarDisplay value={mine.stars} /><span className="li-meta">{mine.date}</span></div>
                {mine.comment && <div className="rating-comment">{mine.comment}</div>}
              </div>
              <button className="btn secondary btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
              <button className="icon-only-btn" title="Remove my rating" onClick={remove} disabled={busy}><TrashIcon /></button>
              {error && <div className="form-error">{error}</div>}
            </div>
          ) : <button className="btn secondary add-row-btn" onClick={startEdit}><PlusIcon /> Rate this subcontractor</button>}
        </Section>
      )}

      <Section title={`All Ratings (${ratings.length})`}>
        {sorted.map(item => (
          <div key={item.id} className="list-item">
            <div className="list-item-content">
              <div className="li-name">
                <StarDisplay value={item.stars} />
                <strong>{item.byName}</strong>
                {me && item.byEmail === me && <span className="mini-chip">You</span>}
              </div>
              {item.comment && <div className="rating-comment">{item.comment}</div>}
              {item.date && <div className="li-meta">{item.date}</div>}
            </div>
          </div>
        ))}
        {!ratings.length && <div className="li-meta">Nobody has rated this subcontractor yet.</div>}
      </Section>
    </>
  )
}

function ContactsTab({ sub, patch, canEdit }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', role: 'Estimator', phone: '', cellPhone: '', email: '' })
  const contacts = sub.contacts || []
  const set = (key, value) => setForm(previous => ({ ...previous, [key]: value }))

  const add = () => {
    if (!form.name.trim()) return alert('Name required')
    patch({ contacts: [...contacts, { id: crypto.randomUUID(), ...form }] })
    setForm({ name: '', role: 'Estimator', phone: '', cellPhone: '', email: '' })
    setAdding(false)
  }

  return (
    <Section title={`Contacts (${contacts.length})`}>
      {contacts.map(contact => (
        <div key={contact.id} className="list-item">
          <div className="list-item-content">
            <div className="li-name"><strong>{contact.name}</strong><span className="mini-chip">{contact.role}</span></div>
            {contact.phone && <div className="li-meta"><PhoneIcon /> {contact.phone}</div>}
            {contact.cellPhone && <div className="li-meta"><PhoneIcon /> {contact.cellPhone} (cell)</div>}
            {contact.email && <div className="li-meta">{contact.email}</div>}
          </div>
          {canEdit && <button className="icon-only-btn" onClick={() => patch({ contacts: contacts.filter(item => item.id !== contact.id) })}><TrashIcon /></button>}
        </div>
      ))}

      {canEdit && (adding ? (
        <div className="inline-form">
          <div className="field-row">
            <Field label="Name"><input value={form.name} onChange={event => set('name', event.target.value)} autoFocus /></Field>
            <Field label="Role"><select value={form.role} onChange={event => set('role', event.target.value)}>{CONTACT_ROLES.map(role => <option key={role}>{role}</option>)}</select></Field>
          </div>
          <div className="field-row">
            <Field label="Phone"><input value={form.phone} onChange={event => set('phone', event.target.value)} /></Field>
            <Field label="Cell"><input value={form.cellPhone} onChange={event => set('cellPhone', event.target.value)} /></Field>
          </div>
          <Field label="Email"><input type="email" value={form.email} onChange={event => set('email', event.target.value)} /></Field>
          <FormButtons onSave={add} onCancel={() => setAdding(false)} />
        </div>
      ) : <button className="btn secondary add-row-btn" onClick={() => setAdding(true)}><PlusIcon /> Add Contact</button>)}
    </Section>
  )
}

function EquipmentTab({ sub, patch, canEdit }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: 'Paver', count: 1, ownership: 'Owned' })
  const equipment = sub.equipment || []

  const add = () => {
    patch({ equipment: [...equipment, { id: crypto.randomUUID(), ...form, count: +form.count }] })
    setForm({ type: 'Paver', count: 1, ownership: 'Owned' })
    setAdding(false)
  }

  return (
    <Section title={`Equipment (${equipment.length})`}>
      {equipment.map(item => (
        <div key={item.id} className="list-item">
          <div className="list-item-content"><div className="li-name"><strong>{item.type}</strong><span className="mini-chip">×{item.count}</span><span className="mini-chip">{item.ownership}</span></div></div>
          {canEdit && <button className="icon-only-btn" onClick={() => patch({ equipment: equipment.filter(value => value.id !== item.id) })}><TrashIcon /></button>}
        </div>
      ))}

      {canEdit && (adding ? (
        <div className="inline-form">
          <div className="field-row field-row-three">
            <Field label="Type"><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}>{EQUIPMENT_TYPES.map(type => <option key={type}>{type}</option>)}</select></Field>
            <Field label="Count"><input type="number" min="1" value={form.count} onChange={event => setForm({ ...form, count: event.target.value })} /></Field>
            <Field label="Ownership"><select value={form.ownership} onChange={event => setForm({ ...form, ownership: event.target.value })}><option>Owned</option><option>Rented</option></select></Field>
          </div>
          <FormButtons onSave={add} onCancel={() => setAdding(false)} />
        </div>
      ) : <button className="btn secondary add-row-btn" onClick={() => setAdding(true)}><PlusIcon /> Add Equipment</button>)}
    </Section>
  )
}

function LicensesTab({ sub, patch, canEdit }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: 'General Contractor', number: '', state: '', expiration: '' })
  const licenses = sub.licenses || []

  const add = () => {
    if (!form.number.trim()) return alert('License number required')
    patch({ licenses: [...licenses, { id: crypto.randomUUID(), ...form }] })
    setForm({ type: 'General Contractor', number: '', state: '', expiration: '' })
    setAdding(false)
  }

  return (
    <Section title={`Licenses (${licenses.length})`}>
      {licenses.map(license => {
        const days = daysUntil(license.expiration)
        return (
          <div key={license.id} className="list-item">
            <div className="list-item-content">
              <div className="li-name"><strong>{license.type}</strong>{license.state && <span className="mini-chip">{license.state}</span>}{days != null && <span className={`mini-chip${days < 0 ? ' chip-expired' : days <= 30 ? ' chip-expiring' : ''}`}>{days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}</span>}</div>
              <div className="li-meta">#{license.number}{license.expiration && ` · expires ${license.expiration}`}</div>
            </div>
            {canEdit && <button className="icon-only-btn" onClick={() => patch({ licenses: licenses.filter(value => value.id !== license.id) })}><TrashIcon /></button>}
          </div>
        )
      })}

      {canEdit && (adding ? (
        <div className="inline-form">
          <Field label="Type"><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}>{LICENSE_TYPES.map(type => <option key={type}>{type}</option>)}</select></Field>
          <div className="field-row field-row-three">
            <Field label="License Number"><input value={form.number} onChange={event => setForm({ ...form, number: event.target.value })} /></Field>
            <Field label="State"><input value={form.state} maxLength="2" onChange={event => setForm({ ...form, state: event.target.value.toUpperCase() })} /></Field>
            <Field label="Expiration"><input type="date" value={form.expiration} onChange={event => setForm({ ...form, expiration: event.target.value })} /></Field>
          </div>
          <FormButtons onSave={add} onCancel={() => setAdding(false)} />
        </div>
      ) : <button className="btn secondary add-row-btn" onClick={() => setAdding(true)}><PlusIcon /> Add License</button>)}
    </Section>
  )
}

function FilesTab({ sub, patch, canEdit }) {
  const inputRef = useRef(null)
  const [pending, setPending] = useState(null)
  const attachments = sub.attachments || []
  const totalKB = attachments.reduce((sum, file) => sum + (file.size || 0), 0) / 1024

  const chooseFile = event => {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = result => setPending({
      id: crypto.randomUUID(),
      type: 'Other',
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      dataBase64: result.target.result,
      uploadedAt: new Date().toISOString(),
    })
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const download = file => {
    const link = document.createElement('a')
    link.href = file.dataBase64
    link.download = file.filename
    link.click()
  }

  return (
    <Section title={`Files (${attachments.length}) · ${totalKB.toFixed(0)} KB`}>
      {totalKB > 5120 && <div className="banner banner-warn"><WarningIcon /> Attachments exceed 5 MB.</div>}
      {attachments.map(file => (
        <div key={file.id} className="list-item">
          <div className="list-item-content"><div className="li-name"><span className="mini-chip">{file.type}</span><span>{file.filename}</span></div><div className="li-meta">{(file.size / 1024).toFixed(1)} KB · uploaded {file.uploadedAt?.slice(0, 10)}</div></div>
          <button className="icon-only-btn" onClick={() => download(file)}><DownloadIcon /></button>
          {canEdit && <button className="icon-only-btn" onClick={() => patch({ attachments: attachments.filter(value => value.id !== file.id) })}><TrashIcon /></button>}
        </div>
      ))}

      {canEdit && pending && (
        <div className="inline-form">
          <div className="li-name"><strong>{pending.filename}</strong><span className="mini-chip">{(pending.size / 1024).toFixed(1)} KB</span></div>
          <Field label="Document Type"><select value={pending.type} onChange={event => setPending({ ...pending, type: event.target.value })}>{ATTACHMENT_TYPES.map(type => <option key={type}>{type}</option>)}</select></Field>
          <FormButtons onSave={() => { patch({ attachments: [...attachments, pending] }); setPending(null) }} onCancel={() => setPending(null)} />
        </div>
      )}

      <input ref={inputRef} type="file" hidden onChange={chooseFile} accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" />
      {canEdit && !pending && <button className="btn secondary add-row-btn" onClick={() => inputRef.current?.click()}><UploadIcon /> Upload File</button>}
    </Section>
  )
}

function MetricsTab({ sub, projects }) {
  const subProjects = projects.filter(project => project.subId === sub.id).sort((a, b) => (b.completionDate || '').localeCompare(a.completionDate || ''))

  return (
    <>
      <Section title="Performance Metrics">
        <div className="metric-grid">
          <Metric value={subProjects.length} label="Projects" />
        </div>
      </Section>
      {subProjects.length > 0 && (
        <Section title="Recent Projects">
          {subProjects.slice(0, 5).map(project => (
            <div key={project.id} className="list-item"><div className="list-item-content"><div className="li-name"><strong>{project.name}</strong></div><div className="li-meta">{[project.city, project.state].filter(Boolean).join(', ')}{project.completionDate && ` · completed ${project.completionDate}`}</div></div></div>
          ))}
        </Section>
      )}
    </>
  )
}

function Section({ title, children }) {
  return <div className="detail-section"><h4>{title}</h4>{children}</div>
}

function Field({ label, children }) {
  return <div className="field">{label && <label>{label}</label>}{children}</div>
}

function FormButtons({ onSave, onCancel, disabled = false }) {
  return <div className="form-buttons"><button className="btn" onClick={onSave} disabled={disabled}>{disabled ? 'Saving…' : 'Save'}</button><button className="btn secondary" onClick={onCancel} disabled={disabled}>Cancel</button></div>
}

function Metric({ value, label }) {
  return <div className="metric-tile"><div className="metric-num">{value}</div><div className="metric-lbl">{label}</div></div>
}
