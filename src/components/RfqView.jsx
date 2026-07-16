import React, { useState } from 'react'
import { CloseIcon } from './icons.jsx'

const TODAY = () => new Date().toISOString().slice(0, 10)

export default function RfqView({ rfqs, setRfqs, subs }) {
  const [showNew, setShowNew] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const createRfq = (r) => {
    setRfqs(prev => [{ ...r, id: crypto.randomUUID() }, ...prev])
    setShowNew(false)
  }

  const updateInvitee = (rfqId, subId, patch) => {
    setRfqs(prev => prev.map(r => {
      if (r.id !== rfqId) return r
      return {
        ...r,
        invitees: r.invitees.map(i => i.subId === subId ? { ...i, ...patch } : i)
      }
    }))
  }

  const deleteRfq = (id) => {
    if (confirm('Delete this RFQ?')) setRfqs(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>RFQs</h2>
          <p className="page-sub">Track requests for quotes, responses, and awards.</p>
        </div>
        <button className="btn" onClick={() => setShowNew(true)}>+ New RFQ</button>
      </div>

      {rfqs.length === 0 ? (
        <div className="empty-page">
          <p>No RFQs yet. Click "New RFQ" to send your first one.</p>
        </div>
      ) : (
        <div className="data-table">
          <div className="dt-head">
            <div>Project</div>
            <div>Sent</div>
            <div>Due</div>
            <div>Invitees</div>
            <div>Responses</div>
            <div>Awarded</div>
            <div></div>
          </div>
          {rfqs.map(r => {
            const responses = r.invitees.filter(i => i.received).length
            const awarded = r.invitees.filter(i => i.awarded).length
            const isOpen = expanded === r.id
            return (
              <React.Fragment key={r.id}>
                <div className="dt-row" onClick={() => setExpanded(isOpen ? null : r.id)}>
                  <div>
                    <div className="dt-primary">{r.projectName}</div>
                    <div className="dt-meta">{r.projectAddress || ''}</div>
                  </div>
                  <div>{r.sentDate}</div>
                  <div>{r.dueDate}</div>
                  <div>{r.invitees.length}</div>
                  <div>{responses}/{r.invitees.length}</div>
                  <div>{awarded}</div>
                  <div><span className="expand-icon">{isOpen ? '▾' : '▸'}</span></div>
                </div>
                {isOpen && (
                  <div className="dt-expanded">
                    {r.scope && <div className="dt-scope"><strong>Scope:</strong> {r.scope}</div>}
                    <div className="invitee-table">
                      <div className="it-head">
                        <div>Subcontractor</div>
                        <div>Received</div>
                        <div>Amount</div>
                        <div>Awarded</div>
                        <div>Notes</div>
                      </div>
                      {r.invitees.map(inv => {
                        const sub = subs.find(s => s.id === inv.subId)
                        return (
                          <div key={inv.subId} className="it-row">
                            <div>{sub?.companyName || 'Unknown'}</div>
                            <div>
                              <input type="checkbox" checked={!!inv.received}
                                     onChange={e => updateInvitee(r.id, inv.subId, { received: e.target.checked })} />
                            </div>
                            <div>
                              <input type="number" placeholder="0" value={inv.amount || ''}
                                     onChange={e => updateInvitee(r.id, inv.subId, { amount: e.target.value })} />
                            </div>
                            <div>
                              <input type="checkbox" checked={!!inv.awarded}
                                     onChange={e => updateInvitee(r.id, inv.subId, { awarded: e.target.checked })} />
                            </div>
                            <div>
                              <input type="text" value={inv.notes || ''}
                                     onChange={e => updateInvitee(r.id, inv.subId, { notes: e.target.value })} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                      <button className="btn secondary btn-sm" onClick={() => deleteRfq(r.id)}>Delete RFQ</button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}

      {showNew && <NewRfqModal subs={subs} onClose={() => setShowNew(false)} onCreate={createRfq} />}
    </div>
  )
}

function NewRfqModal({ subs, onClose, onCreate }) {
  const [f, setF] = useState({
    projectName: '', projectAddress: '', scope: '',
    sentDate: TODAY(), dueDate: '', invitees: []
  })
  const [query, setQuery] = useState('')
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))

  const toggle = (id) => {
    const has = f.invitees.some(i => i.subId === id)
    set('invitees', has ? f.invitees.filter(i => i.subId !== id) : [...f.invitees, { subId: id, received: false, amount: '', awarded: false, notes: '' }])
  }

  const filtered = query.trim()
    ? subs.filter(s => s.companyName.toLowerCase().includes(query.toLowerCase())).slice(0, 40)
    : subs.slice(0, 40)

  const submit = () => {
    if (!f.projectName.trim()) return alert('Project name required')
    if (!f.invitees.length) return alert('Add at least one invitee')
    onCreate(f)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">New RFQ</div>
          <button className="close-btn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body">
          <div className="field"><label>Project Name *</label>
            <input value={f.projectName} onChange={e => set('projectName', e.target.value)} autoFocus /></div>
          <div className="field"><label>Project Address</label>
            <input value={f.projectAddress} onChange={e => set('projectAddress', e.target.value)} /></div>
          <div className="field-row">
            <div className="field"><label>Sent Date</label>
              <input type="date" value={f.sentDate} onChange={e => set('sentDate', e.target.value)} /></div>
            <div className="field"><label>Due Date</label>
              <input type="date" value={f.dueDate} onChange={e => set('dueDate', e.target.value)} /></div>
          </div>
          <div className="field"><label>Scope</label>
            <textarea value={f.scope} onChange={e => set('scope', e.target.value)}
                      placeholder="Describe what you're requesting quotes for..." /></div>
          <div className="field">
            <label>Invitees ({f.invitees.length} selected)</label>
            <input placeholder="Search subs to add..." value={query}
                   onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="invitee-picker">
            {filtered.map(s => {
              const sel = f.invitees.some(i => i.subId === s.id)
              return (
                <div key={s.id} className={'picker-row' + (sel ? ' selected' : '')}
                     onClick={() => toggle(s.id)}>
                  <input type="checkbox" checked={sel} readOnly />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.companyName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.city}, {s.state}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit}>Create RFQ</button>
        </div>
      </div>
    </div>
  )
}
