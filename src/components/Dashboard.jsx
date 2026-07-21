import React, { useMemo } from 'react'
import { complianceStatus, daysUntil } from '../lib/metrics.js'

function StatCard({ label, value, color, sub }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color || 'var(--hpp-green)' }}>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}

export default function Dashboard({ subs, projects, onOpenSub }) {
  const stats = useMemo(() => {
    const total = subs.length
    const byStatus = {}
    const byCompliance = { compliant: 0, expiring: 0, pending: 0, 'non-compliant': 0 }
    const byState = {}
    for (const s of subs) {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1
      byCompliance[complianceStatus(s)]++
      if (s.state) byState[s.state] = (byState[s.state] || 0) + 1
    }
    return { total, byStatus, byCompliance, byState }
  }, [subs])

  const renewals = useMemo(() => {
    const rows = []
    for (const s of subs) {
      const items = []
      if (s.coiGL)   { const d = daysUntil(s.coiGL);   if (d !== null && d <= 60) items.push({ type: 'COI - GL',   days: d, date: s.coiGL }) }
      if (s.coiAuto) { const d = daysUntil(s.coiAuto); if (d !== null && d <= 60) items.push({ type: 'COI - Auto', days: d, date: s.coiAuto }) }
      if (s.coiWC)   { const d = daysUntil(s.coiWC);   if (d !== null && d <= 60) items.push({ type: 'COI - WC',   days: d, date: s.coiWC }) }
      for (const l of (s.licenses || [])) {
        const d = daysUntil(l.expiration)
        if (d !== null && d <= 60) items.push({ type: `License: ${l.type}`, days: d, date: l.expiration })
      }
      for (const it of items) rows.push({ sub: s, ...it })
    }
    return rows.sort((a,b) => a.days - b.days).slice(0, 50)
  }, [subs])

  const topStates = Object.entries(stats.byState).sort((a,b) => b[1]-a[1]).slice(0, 8)

  return (
    <div className="dashboard">
      <div className="dashboard-section">
        <h3>Overview</h3>
        <div className="stat-grid">
          <StatCard label="Total Subcontractors" value={stats.total} />
          <StatCard label="Vetted"       value={stats.byStatus['Vetted']      || 0} color="#1a5c38" />
          <StatCard label="Recommended"  value={stats.byStatus['Recommended'] || 0} color="#ca8a04" />
          <StatCard label="New"          value={stats.byStatus['New']         || 0} color="#2563eb" />
          <StatCard label="DNU"          value={stats.byStatus['DNU']         || 0} color="#dc2626" />
        </div>
      </div>

      <div className="dashboard-section">
        <h3>Compliance Status</h3>
        <div className="stat-grid">
          <StatCard label="Compliant" value={stats.byCompliance.compliant} color="#1a5c38"
                    sub={stats.total ? `${Math.round(stats.byCompliance.compliant/stats.total*100)}%` : ''} />
          <StatCard label="Expiring in 30 Days" value={stats.byCompliance.expiring} color="#b45309"
                    sub={stats.total ? `${Math.round(stats.byCompliance.expiring/stats.total*100)}%` : ''} />
          <StatCard label="Pending / Missing Docs" value={stats.byCompliance.pending} color="#6b7280"
                    sub={stats.total ? `${Math.round(stats.byCompliance.pending/stats.total*100)}%` : ''} />
          <StatCard label="Non-Compliant" value={stats.byCompliance['non-compliant']} color="#dc2626"
                    sub={stats.total ? `${Math.round(stats.byCompliance['non-compliant']/stats.total*100)}%` : ''} />
        </div>
      </div>

      <div className="dashboard-section">
        <h3>Renewal Pipeline — next 60 days ({renewals.length})</h3>
        {renewals.length === 0 ? <div className="empty">Nothing expiring soon.</div> : (
          <div className="renewal-list">
            {renewals.map((r,i) => (
              <div key={i} className={'renewal-row ' + (r.days < 0 ? 'expired' : r.days <= 30 ? 'soon' : '')}
                   onClick={() => onOpenSub(r.sub.id)}>
                <div className="renewal-days">
                  <div className="renewal-days-num">{r.days < 0 ? `${Math.abs(r.days)}d ago` : `${r.days}d`}</div>
                  <div className="renewal-days-label">{r.days < 0 ? 'expired' : 'until'}</div>
                </div>
                <div className="renewal-body">
                  <div className="renewal-sub-name">{r.sub.companyName}</div>
                  <div className="renewal-meta">{r.type} · expires {r.date}</div>
                </div>
                <div className="renewal-loc">{r.sub.city}, {r.sub.state}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h3>By State (top 8)</h3>
        <div className="top-list">
          {topStates.map(([st, n]) => (
            <div key={st} className="top-row">
              <div className="top-rank">{st}</div>
              <div className="top-body"><div className="top-name">{n} subs</div></div>
              <div className="top-score">
                <div className="bar" style={{ width: `${Math.min(100, n/stats.total*100 * 4)}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}