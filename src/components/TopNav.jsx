import React from 'react'
import { LOGOUT_URL } from '../lib/auth.js'

// Pricing and Projects tabs removed per SubFinder review (Jul 24 call).
// RFQs is an HPS workflow, so it's hidden from BU users.
const ALL_TABS = [
  { key: 'map', label: 'Map' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'rfqs', label: 'RFQs', roles: ['admin', 'hps'] },
]

function roleLabel(user) {
  if (!user) return ''
  if (user.role === 'admin') return 'Admin'
  if (user.role === 'bu') return user.bu || 'Business Unit'
  return 'HPS'
}

export default function TopNav({ active, onChange, alertCount, user }) {
  const role = user?.role || 'hps'
  const tabs = ALL_TABS.filter(t => !t.roles || t.roles.includes(role))

  return (
    <div className="topnav">
      <div className="topnav-brand">
        <div className="topnav-mark">HPP</div>
        <div className="topnav-name">Heartland Paving Partners</div>
      </div>

      <div className="topnav-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={'topnav-tab' + (active === t.key ? ' active' : '')}
            onClick={() => onChange(t.key)}
          >
            {t.label}
            {t.key === 'dashboard' && alertCount > 0 && (
              <span className="topnav-badge">{alertCount}</span>
            )}
          </button>
        ))}
      </div>

      {user?.authenticated && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <div style={{ textAlign: 'right', lineHeight: 1.2, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
              {user.name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{roleLabel(user)}</div>
          </div>
          <a
            className="btn secondary btn-sm"
            href={LOGOUT_URL}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            Sign out
          </a>
        </div>
      )}
    </div>
  )
}
