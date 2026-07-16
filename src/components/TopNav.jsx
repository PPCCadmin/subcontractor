import React from 'react'
const TABS = [
  { key: 'map',       label: 'Map' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'rfqs',      label: 'RFQs' },
  { key: 'projects',  label: 'Projects' },
  { key: 'pricing',   label: 'Pricing' },
]
export default function TopNav({ active, onChange, alertCount }) {
  return (
    <nav className="topnav">
      <div className="topnav-brand">
        <span className="topnav-mark">HPP</span>
        <span className="topnav-name">Heartland Paving Partners</span>
      </div>
      <div className="topnav-tabs">
        {TABS.map(t => (
          <button key={t.key}
                  className={'topnav-tab' + (active === t.key ? ' active' : '')}
                  onClick={() => onChange(t.key)}>
            {t.label}
            {t.key === 'dashboard' && alertCount > 0 && (
              <span className="topnav-badge">{alertCount}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
