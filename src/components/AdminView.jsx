import React, { useEffect, useState } from 'react'
import { getAccess, saveAccess } from '../lib/api.js'
import { PlusIcon, TrashIcon, SearchIcon } from './icons.jsx'

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Admin tab: choose who can use SubFinder, which business units each person
// sees, and who is an admin. Changes apply when the person next loads the site.
export default function AdminView() {
  const [loaded, setLoaded] = useState(null)
  const [users, setUsers] = useState([])
  const [radius, setRadius] = useState(200)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [search, setSearch] = useState('')

  const load = () => {
    setLoadError('')
    getAccess()
      .then(data => {
        setLoaded(data)
        setUsers(data.users || [])
        setRadius(data.radiusMiles)
        setMessage(null)
      })
      .catch(error => setLoadError(error.message))
  }
  useEffect(load, [])

  const dirty = loaded && (radius !== loaded.radiusMiles || JSON.stringify(users) !== JSON.stringify(loaded.users || []))

  useEffect(() => {
    if (!dirty) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const builtIn = new Set(loaded?.builtInAdmins || [])

  const update = (email, changes) => setUsers(previous => previous.map(user => user.email === email ? { ...user, ...changes } : user))

  const toggleUnit = (user, key) => {
    const current = user.businessUnits || []
    update(user.email, { businessUnits: current.includes(key) ? current.filter(item => item !== key) : [...current, key] })
  }

  const addUser = event => {
    event.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(email)) return setMessage({ type: 'error', text: 'Enter a full email address, e.g. jane.doe@heartlandpavingpartners.com' })
    if (users.some(user => user.email === email)) return setMessage({ type: 'error', text: `${email} is already on the list.` })
    if (builtIn.has(email)) return setMessage({ type: 'error', text: `${email} is a built-in admin and already has full access.` })
    setUsers(previous => [{ email, name: newName.trim(), admin: false, allBusinessUnits: false, businessUnits: [] }, ...previous])
    setNewEmail('')
    setNewName('')
    setMessage({ type: 'info', text: `Added ${email}. Pick their business units, then click Save changes.` })
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const data = await saveAccess({ users, radiusMiles: Number(radius), version: loaded.version })
      setLoaded(previous => ({ ...previous, ...data }))
      setUsers(data.users)
      setRadius(data.radiusMiles)
      setMessage({ type: 'success', text: 'Saved. People will see the change the next time they load SubFinder.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="admin-page">
        <div className="banner banner-warn">Couldn't load the access list: {loadError}</div>
        <button className="btn" onClick={load}>Try again</button>
      </div>
    )
  }
  if (!loaded) return <div className="admin-page">Loading…</div>

  const query = search.trim().toLowerCase()
  const shown = users.filter(user => !query || `${user.email} ${user.name || ''}`.toLowerCase().includes(query))

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h2>Access</h2>
          <p className="admin-sub">Choose who can use SubFinder and which business units' subcontractors each person sees. Anyone not listed here can't see anything.</p>
        </div>
      </div>

      {!loaded.canSave && (
        <div className="banner banner-warn">Storage isn't working, so the access list can't be saved right now. Only built-in admins can get in.</div>
      )}

      <section className="admin-card">
        <h3>Business unit radius</h3>
        <div className="admin-radius">
          People assigned a business unit see subcontractors within
          <input type="number" min="1" max="3000" value={radius} onChange={event => setRadius(event.target.value === '' ? '' : Number(event.target.value))} />
          miles of that office.
        </div>
        <ul className="admin-units">
          {loaded.businessUnits.map(unit => <li key={unit.key}><strong>{unit.name}</strong> · {unit.address}</li>)}
        </ul>
      </section>

      <section className="admin-card">
        <h3>Add a person</h3>
        <form className="admin-add" onSubmit={addUser}>
          <input type="email" placeholder="Microsoft email address" value={newEmail} onChange={event => setNewEmail(event.target.value)} />
          <input type="text" placeholder="Name (optional)" value={newName} onChange={event => setNewName(event.target.value)} />
          <button className="btn" type="submit"><PlusIcon /> Add</button>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-list-head">
          <h3>People ({users.length})</h3>
          {users.length > 8 && (
            <div className="search admin-search">
              <SearchIcon />
              <input type="text" placeholder="Search people" value={search} onChange={event => setSearch(event.target.value)} />
            </div>
          )}
        </div>

        <div className="admin-users">
          {[...builtIn].map(email => (
            <div key={email} className="admin-user locked">
              <div className="admin-user-id">
                <div className="admin-email">{email}</div>
                <div className="admin-note">Built-in admin · always sees everything and can edit</div>
              </div>
            </div>
          ))}

          {shown.map(user => {
            const noAccess = !user.admin && !user.allBusinessUnits && !(user.businessUnits || []).length
            return (
              <div key={user.email} className={`admin-user${noAccess ? ' warn' : ''}`}>
                <div className="admin-user-id">
                  <div className="admin-email">{user.email}</div>
                  <input className="admin-name" type="text" placeholder="Name" value={user.name || ''} onChange={event => update(user.email, { name: event.target.value })} />
                </div>

                <div className="admin-user-access">
                  <div className="admin-toggles">
                    <label><input type="checkbox" checked={user.admin} onChange={event => update(user.email, { admin: event.target.checked })} /> Admin (can edit, sees everything)</label>
                    {!user.admin && (
                      <label><input type="checkbox" checked={user.allBusinessUnits} onChange={event => update(user.email, { allBusinessUnits: event.target.checked })} /> All business units</label>
                    )}
                  </div>
                  {!user.admin && !user.allBusinessUnits && (
                    <div className="admin-note admin-units-label">Business units they can see (pick one or more):</div>
                  )}
                  {!user.admin && !user.allBusinessUnits && (
                    <div className="chips">
                      {loaded.businessUnits.map(unit => (
                        <button type="button" key={unit.key} className={`chip${(user.businessUnits || []).includes(unit.key) ? ' active' : ''}`} onClick={() => toggleUnit(user, unit.key)}>
                          {unit.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {noAccess && <div className="admin-note admin-warn">No business units picked, so this person can't see anything yet.</div>}
                </div>

                <button className="icon-only-btn" title={`Remove ${user.email}`} onClick={() => setUsers(previous => previous.filter(item => item.email !== user.email))}><TrashIcon /></button>
              </div>
            )
          })}

          {!users.length && <div className="admin-note">Nobody added yet. Add people above to give them access.</div>}
        </div>
      </section>

      <div className="admin-savebar">
        {message && <span className={`admin-message ${message.type}`}>{message.text}</span>}
        {dirty && !message && <span className="admin-message">You have unsaved changes.</span>}
        {dirty && <button className="btn secondary" onClick={load} disabled={saving}>Discard</button>}
        <button className="btn" onClick={save} disabled={!dirty || saving || !loaded.canSave}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>

      {loaded.updatedAt && (
        <div className="admin-note admin-updated">Last changed {new Date(loaded.updatedAt).toLocaleString()}{loaded.updatedBy ? ` by ${loaded.updatedBy}` : ''}.</div>
      )}
    </div>
  )
}
