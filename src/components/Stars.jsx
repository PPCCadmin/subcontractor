import React, { useState } from 'react'

const STAR_PATH = 'M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5z'

function Star({ fill, size }) {
  // fill: 0..1 portion of the star that is filled
  const id = React.useId()
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
          <stop offset={`${fill * 100}%`} stopColor="#d6d3d1" />
        </linearGradient>
      </defs>
      <path d={STAR_PATH} fill={`url(#${id})`} />
    </svg>
  )
}

// Read-only star display; supports fractional values (e.g. an average of 4.3).
export function StarDisplay({ value, size = 14 }) {
  return (
    <span className="stars" role="img" aria-label={`${value?.toFixed(1) ?? 0} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => <Star key={n} size={size} fill={Math.max(0, Math.min(1, (value || 0) - n + 1))} />)}
    </span>
  )
}

// Clickable 1–5 star picker.
export function StarInput({ value, onChange, size = 26 }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value || 0
  return (
    <span className="stars star-input" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          type="button"
          key={n}
          className="star-btn"
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          aria-pressed={value === n}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <Star size={size} fill={n <= shown ? 1 : 0} />
        </button>
      ))}
    </span>
  )
}
