import React from 'react'
import { LOGOUT_URL } from '../lib/auth.js'

const ALL_TABS = [
  { key: 'map', label: 'Map' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'admin', label: 'Admin', roles: ['admin'] },
]

function roleLabel(user) {
  if (!user) return ''
  if (user.role === 'admin') return 'Admin'
  if (user.role === 'viewer') return user.allBusinessUnits ? 'All business units' : (user.areas || []).map(area => area.name).join(', ')
  return 'No access'
}

export default function TopNav({ active, onChange, user }) {
  const role = user?.role || 'none'
  const tabs = ALL_TABS.filter(tab => !tab.roles || tab.roles.includes(role))

  return (
    <div className="topnav">
      <div className="topnav-brand">
        <div className="topnav-mark">HPP</div>
        <div className="topnav-name">Heartland Paving Partners</div>
      </div>

      <div className="topnav-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`topnav-tab${active === tab.key ? ' active' : ''}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {user?.authenticated && (
        <div className="topnav-user">
          <div className="topnav-user-copy">
            <div className="topnav-user-name">{user.name}</div>
            <div className="topnav-user-role">{roleLabel(user)}</div>
          </div>
          <a className="btn secondary btn-sm topnav-signout" href={LOGOUT_URL}>Sign out</a>
        </div>
      )}
    </div>
  )
}
