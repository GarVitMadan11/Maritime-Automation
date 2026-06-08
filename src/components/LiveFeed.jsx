import { useState } from 'react'

const STATUS_META = {
  clean:    { label: 'Processed',  dot: 'var(--primary-dim)',    text: 'var(--primary-dim)' },
  urgent:   { label: 'Urgent',     dot: 'var(--color-warning)',  text: 'var(--color-warning)' },
  critical: { label: 'Critical',   dot: 'var(--color-error)',    text: 'var(--color-error)' },
  exception:{ label: 'Exception',  dot: 'var(--color-exception)',text: 'var(--color-exception)' },
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function StatusPill({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.clean
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: m.dot,
        animation: status === 'clean' ? 'none' : 'dot-blink 2s ease infinite',
      }} />
      <span style={{ fontSize: 12, color: m.text }}>{m.label}</span>
    </span>
  )
}

export function LiveFeed({ records, selected, onSelect, filter, onFilterChange, search, onSearchChange }) {
  const filtered = records.filter(r => {
    const matchFilter = filter === 'all' || r.status === filter
    const term = search.toLowerCase()
    const matchSearch = !term ||
      (r.vessel ?? '').toLowerCase().includes(term) ||
      (r.container ?? '').toLowerCase().includes(term) ||
      (r.pod ?? '').toLowerCase().includes(term) ||
      r.id.toLowerCase().includes(term)
    return matchFilter && matchSearch
  })

  const COL = '140px 1fr 130px 70px'

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--surface-container-low)',
      border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--outline-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <i className="ti ti-search" style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, color: 'var(--on-surface-muted)', pointerEvents: 'none',
            }} />
            <input
              type="text" placeholder="Search vessel, container, POD…"
              value={search} onChange={e => onSearchChange(e.target.value)}
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12 }}
            />
          </div>
          <select value={filter} onChange={e => onFilterChange(e.target.value)}
            style={{ minWidth: 130 }}>
            <option value="all">All statuses</option>
            <option value="clean">Processed</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
            <option value="exception">Exception</option>
          </select>
        </div>
        {/* Live badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)',
            animation: 'dot-blink 1.5s ease infinite',
            boxShadow: '0 0 6px var(--primary)',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
            Live Updates
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: COL, gap: 12,
        padding: '8px 20px', background: 'var(--surface-container)',
        borderBottom: '1px solid var(--outline-dim)',
      }}>
        {['Timestamp', 'Sender / Document', 'Status', 'Accuracy'].map(h => (
          <span key={h} style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            color: 'var(--on-surface-muted)', textTransform: 'uppercase',
          }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--on-surface-muted)', fontSize: 13 }}>
            No records match your filter.
          </div>
        ) : (
          filtered.map(r => {
            const isSelected = selected?.id === r.id
            const acc = r.accuracy ?? 100
            const accColor = r.status === 'exception' ? 'var(--color-exception)' : 'var(--primary-dim)'
            return (
              <div
                key={r.id}
                onClick={() => onSelect(isSelected ? null : r)}
                style={{
                  display: 'grid', gridTemplateColumns: COL, gap: 12,
                  padding: '11px 20px', alignItems: 'center',
                  background: isSelected ? 'var(--surface-container)' : 'transparent',
                  borderBottom: '1px solid var(--outline-dim)',
                  borderLeft: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-container)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Timestamp */}
                <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                  {fmtTime(r.ts)} UTC
                </span>
                {/* Document */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <i className={`ti ${r.status === 'exception' ? 'ti-file-alert' : 'ti-file-text'}`}
                    style={{ fontSize: 14, color: r.status === 'exception' ? 'var(--color-exception)' : 'var(--on-surface-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.doc}
                  </span>
                </div>
                {/* Status */}
                <StatusPill status={r.status} />
                {/* Accuracy */}
                <span style={{ fontSize: 13, fontWeight: 600, color: accColor, fontFamily: 'var(--font-mono)' }}>
                  {acc}%
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 20px', borderTop: '1px solid var(--outline-dim)',
        fontSize: 11, color: 'var(--on-surface-muted)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Showing {filtered.length} of {records.length} records</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>USEC Freight Operations</span>
      </div>
    </div>
  )
}
