import React, { useState } from 'react'
import Papa from 'papaparse'
import { CloseIcon } from './icons.jsx'
import { buildSub, findDuplicate, downloadCsvTemplate, CSV_TEMPLATE_HEADERS } from '../lib/subUtils.js'

export default function CsvImportModal({ existingSubs, onClose, onImport }) {
  const [parsed, setParsed] = useState(null)
  const [importing, setImporting] = useState(false)

  const handleFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const newRows = []
        const dupes = []
        const errors = []
        for (const row of res.data) {
          if (!row.companyName?.trim()) { errors.push({ row, reason: 'Missing company name' }); continue }
          const dup = findDuplicate(existingSubs, row)
          if (dup) dupes.push({ row, existing: dup })
          else newRows.push(row)
        }
        setParsed({ total: res.data.length, newRows, dupes, errors })
      }
    })
  }

  const doImport = () => {
    if (!parsed) return
    setImporting(true)
    const built = parsed.newRows.map(buildSub)
    onImport(built)
    setImporting(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Import Subcontractors from CSV</div>
          <button className="close-btn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body">
          {!parsed && (
            <>
              <p className="help-text">
                Upload a CSV with subcontractor data. Anything that already exists will be skipped.
              </p>
              <div className="csv-drop">
                <input
                  type="file" accept=".csv,text/csv"
                  id="csv-input"
                  onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
                />
                <label htmlFor="csv-input" className="btn">Choose CSV file</label>
              </div>
              <div style={{ marginTop: 20 }}>
                <div className="filter-label">Required Columns</div>
                <div className="csv-cols">
                  {CSV_TEMPLATE_HEADERS.map(h => (
                    <span key={h} className="mini-chip">{h}</span>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn secondary" onClick={downloadCsvTemplate}>
                    Download Template
                  </button>
                </div>
              </div>
            </>
          )}
          {parsed && (
            <>
              <div className="import-summary">
                <div className="stat">
                  <div className="stat-num">{parsed.total}</div>
                  <div className="stat-label">Rows Parsed</div>
                </div>
                <div className="stat stat-add">
                  <div className="stat-num">{parsed.newRows.length}</div>
                  <div className="stat-label">Will Add</div>
                </div>
                <div className="stat stat-skip">
                  <div className="stat-num">{parsed.dupes.length}</div>
                  <div className="stat-label">Duplicates</div>
                </div>
                {parsed.errors.length > 0 && (
                  <div className="stat stat-err">
                    <div className="stat-num">{parsed.errors.length}</div>
                    <div className="stat-label">Errors</div>
                  </div>
                )}
              </div>

              {parsed.newRows.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="filter-label">New Subs to Import (first 10)</div>
                  <div className="preview-list">
                    {parsed.newRows.slice(0, 10).map((r, i) => (
                      <div key={i} className="preview-row">
                        <div className="preview-name">{r.companyName}</div>
                        <div className="preview-meta">
                          {[r.city, r.state].filter(Boolean).join(', ') || '—'}
                        </div>
                      </div>
                    ))}
                    {parsed.newRows.length > 10 && (
                      <div className="preview-more">+ {parsed.newRows.length - 10} more</div>
                    )}
                  </div>
                </div>
              )}

              {parsed.dupes.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="filter-label">Duplicates (first 5)</div>
                  <div className="preview-list">
                    {parsed.dupes.slice(0, 5).map((d, i) => (
                      <div key={i} className="preview-row">
                        <div className="preview-name">{d.row.companyName}</div>
                        <div className="preview-meta">
                          matches existing: {d.existing.companyName} ({d.existing.city}, {d.existing.state})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          {parsed && parsed.newRows.length > 0 && (
            <button className="btn" onClick={doImport} disabled={importing}>
              Import {parsed.newRows.length} New Sub{parsed.newRows.length === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}