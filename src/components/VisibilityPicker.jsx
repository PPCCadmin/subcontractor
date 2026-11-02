import React from 'react'

// Who can see a subcontractor: everyone whose business unit is in range
// (value = null), or only the chosen business units (value = ['macadam', ...]).
// Admins always see everything.
export default function VisibilityPicker({ units = [], value, onChange }) {
  const limited = Array.isArray(value)
  const selected = limited ? value : []

  const toggle = key => {
    const next = selected.includes(key) ? selected.filter(item => item !== key) : [...selected, key]
    onChange(next)
  }

  return (
    <div className="visibility-picker">
      <label className="visibility-option">
        <input type="radio" checked={!limited} onChange={() => onChange(null)} />
        All business units within range
      </label>
      <label className="visibility-option">
        <input type="radio" checked={limited} onChange={() => onChange(selected)} />
        Only these business units
      </label>
      {limited && (
        <>
          <div className="chips visibility-chips">
            {units.map(unit => (
              <button type="button" key={unit.key} className={`chip${selected.includes(unit.key) ? ' active' : ''}`} onClick={() => toggle(unit.key)}>
                {unit.name}
              </button>
            ))}
          </div>
          <div className="visibility-help">
            {selected.length
              ? 'Only people in these business units (plus admins and people with all business units) will see it, wherever it is.'
              : 'Pick at least one business unit. Until you do, only admins and people with all business units can see it.'}
          </div>
        </>
      )}
    </div>
  )
}

export function visibilityLabel(value, units = []) {
  if (!Array.isArray(value)) return null
  if (!value.length) return 'No business units picked'
  const names = value.map(key => units.find(unit => unit.key === key)?.name || key)
  return `Only ${names.join(', ')}`
}
