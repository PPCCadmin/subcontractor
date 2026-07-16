import React from 'react'
import { daysUntil } from '../lib/metrics.js'

export default function ExpirationBanner({ subs, onView }) {
  const soon = subs.filter(s => {
    return [s.coiGL, s.coiAuto, s.coiWC].some(d => {
      const days = daysUntil(d)
      return days !== null && days >= 0 && days <= 30
    })
  })
  if (!soon.length) return null
  return (
    <div className="banner banner-warn">
      <div>
        <strong>{soon.length}</strong> subcontractor{soon.length===1?'':'s'} with COIs expiring in the next 30 days
      </div>
      <button className="btn secondary btn-sm" onClick={onView}>View Renewals</button>
    </div>
  )
}
