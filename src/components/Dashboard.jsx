import React, { useMemo } from 'react'

function StatCard({ label, value, color, sub }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color || 'var(--hpp-green)' }}>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}

export default function Dashboard({ subs, totalRecords = subs.length }) {
  const stats = useMemo(() => {
    const byStatus = {}
    const byState = {}
    const byService = {}

    for (const sub of subs) {
      byStatus[sub.status] = (byStatus[sub.status] || 0) + 1
      if (sub.state) byState[sub.state] = (byState[sub.state] || 0) + 1
      for (const service of sub.canonicalServices || []) {
        byService[service] = (byService[service] || 0) + 1
      }
    }

    return { total: subs.length, byStatus, byState, byService }
  }, [subs])

  const topStates = Object.entries(stats.byState).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const topServices = Object.entries(stats.byService).sort((a, b) => b[1] - a[1])

  return (
    <div className="dashboard">
      <div className="dashboard-section">
        <h3>Overview</h3>
        <div className="stat-grid">
          <StatCard label="Total Records" value={totalRecords.toLocaleString()} sub={totalRecords === stats.total ? 'All loaded records' : `${stats.total.toLocaleString()} visible to your role`} />
          <StatCard label="Vetted" value={(stats.byStatus.Vetted || 0).toLocaleString()} color="#1a5c38" />
          <StatCard label="Recommended" value={(stats.byStatus.Recommended || 0).toLocaleString()} color="#ca8a04" />
          <StatCard label="New" value={(stats.byStatus.New || 0).toLocaleString()} color="#2563eb" />
          <StatCard label="DNU" value={(stats.byStatus.DNU || 0).toLocaleString()} color="#dc2626" />
        </div>
      </div>

      <div className="dashboard-columns">
        <div className="dashboard-section">
          <h3>Services</h3>
          <div className="top-list">
            {topServices.map(([service, count]) => (
              <div key={service} className="top-row">
                <div className="top-body"><div className="top-name">{service}</div></div>
                <div className="top-count">{count.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h3>By State</h3>
          <div className="top-list">
            {topStates.map(([state, count]) => (
              <div key={state} className="top-row">
                <div className="top-rank">{state}</div>
                <div className="top-body"><div className="top-name">{count.toLocaleString()} subcontractors</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
