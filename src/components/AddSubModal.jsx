import React, { useState } from 'react'
import { STATUSES } from '../data.js'
import { CloseIcon } from './icons.jsx'
import { buildSub, findDuplicate } from '../lib/subUtils.js'

const EMPTY = {
  companyName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  cellPhone: '',
  email: '',
  contactName: '',
  position: '',
  website: '',
  servicesRaw: '',
  notes: '',
  status: 'New',
  rating: null
}

export default function AddSubModal({
  existingSubs,
  onClose,
  onCreate
}) {
  const [f, setF] = useState(EMPTY)
  const [dupeWarn, setDupeWarn] = useState(null)
  const [hoveredRating, setHoveredRating] = useState(null)

  const set = (key, value) => {
    setF(previous => ({
      ...previous,
      [key]: value
    }))
  }

  const check = () => {
    if (!f.companyName.trim()) return

    const duplicate = findDuplicate(existingSubs, f)
    setDupeWarn(duplicate)
  }

  const submit = (force = false) => {
    if (!f.companyName.trim()) {
      alert('Company name is required.')
      return
    }

    const duplicate = findDuplicate(existingSubs, f)

    if (duplicate && !force) {
      setDupeWarn(duplicate)
      return
    }

    onCreate(buildSub(f))
    onClose()
  }

  const displayedRating = hoveredRating ?? f.rating ?? 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={event => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">
            Add Subcontractor
          </div>

          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>Company Name *</label>

            <input
              value={f.companyName}
              onChange={event =>
                set('companyName', event.target.value)
              }
              onBlur={check}
              autoFocus
            />
          </div>

          {dupeWarn && (
            <div className="dupe-warning">
              <strong>Possible duplicate:</strong>{' '}
              {dupeWarn.companyName}

              {(dupeWarn.city || dupeWarn.state) && (
                <>
                  {' '}
                  ({dupeWarn.city || 'Unknown city'},{' '}
                  {dupeWarn.state || 'Unknown state'})
                </>
              )}

              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  gap: 8
                }}
              >
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setDupeWarn(null)}
                >
                  Add anyway
                </button>
              </div>
            </div>
          )}

          <div className="field">
            <label>Address</label>

            <input
              value={f.address}
              onChange={event =>
                set('address', event.target.value)
              }
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label>City</label>

              <input
                value={f.city}
                onChange={event =>
                  set('city', event.target.value)
                }
                onBlur={check}
              />
            </div>

            <div className="field">
              <label>State</label>

              <input
                value={f.state}
                onChange={event =>
                  set(
                    'state',
                    event.target.value
                      .toUpperCase()
                      .slice(0, 2)
                  )
                }
                onBlur={check}
                maxLength={2}
                placeholder="WI"
              />
            </div>

            <div className="field">
              <label>Zip</label>

              <input
                value={f.zip}
                onChange={event =>
                  set('zip', event.target.value)
                }
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Phone</label>

              <input
                value={f.phone}
                onChange={event =>
                  set('phone', event.target.value)
                }
                onBlur={check}
              />
            </div>

            <div className="field">
              <label>Cell</label>

              <input
                value={f.cellPhone}
                onChange={event =>
                  set('cellPhone', event.target.value)
                }
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Contact Name</label>

              <input
                value={f.contactName}
                onChange={event =>
                  set('contactName', event.target.value)
                }
              />
            </div>

            <div className="field">
              <label>Position</label>

              <input
                value={f.position}
                onChange={event =>
                  set('position', event.target.value)
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Email</label>

            <input
              type="email"
              value={f.email}
              onChange={event =>
                set('email', event.target.value)
              }
            />
          </div>

          <div className="field">
            <label>Website</label>

            <input
              value={f.website}
              onChange={event =>
                set('website', event.target.value)
              }
            />
          </div>

          <div className="field">
            <label>Services (comma-separated)</label>

            <input
              value={f.servicesRaw}
              onChange={event =>
                set('servicesRaw', event.target.value)
              }
              placeholder="Asphalt, Sealcoat, Striping"
            />
          </div>

          <div className="field">
            <label>Status</label>

            <select
              value={f.status}
              onChange={event =>
                set('status', event.target.value)
              }
            >
              {STATUSES.map(status => (
                <option
                  key={status.key}
                  value={status.key}
                >
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>
              Rating{' '}
              {f.rating
                ? `(${f.rating} out of 5)`
                : '(Not rated)'}
            </label>

            <div
              role="radiogroup"
              aria-label="Subcontractor rating"
              onMouseLeave={() => setHoveredRating(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                minHeight: 42
              }}
            >
              {[1, 2, 3, 4, 5].map(star => {
                const selected = star <= displayedRating

                return (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={f.rating === star}
                    aria-label={`${star} out of 5 stars`}
                    title={`${star} out of 5 stars`}
                    onMouseEnter={() =>
                      setHoveredRating(star)
                    }
                    onFocus={() =>
                      setHoveredRating(star)
                    }
                    onBlur={() =>
                      setHoveredRating(null)
                    }
                    onClick={() => set('rating', star)}
                    style={{
                      appearance: 'none',
                      background: 'transparent',
                      border: 0,
                      padding: 2,
                      margin: 0,
                      color: selected
                        ? '#f5b301'
                        : '#c7c7c7',
                      fontSize: 30,
                      lineHeight: 1,
                      cursor: 'pointer'
                    }}
                  >
                    ★
                  </button>
                )
              })}

              {f.rating !== null && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => set('rating', null)}
                  style={{
                    marginLeft: 8,
                    padding: '6px 10px'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label>Notes</label>

            <textarea
              value={f.notes}
              onChange={event =>
                set('notes', event.target.value)
              }
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => submit(Boolean(dupeWarn))}
          >
            {dupeWarn
              ? 'Add Anyway'
              : 'Add Subcontractor'}
          </button>
        </div>
      </div>
    </div>
  )
}
