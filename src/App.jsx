import { useState } from 'react'
import { SEED_RECORDS } from './data/seed.js'
import { Dashboard } from './pages/Dashboard.jsx'
import { Logs }      from './pages/Logs.jsx'
import { Health }    from './pages/Health.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',          icon: 'ti-layout-dashboard' },
  { id: 'logs',      label: 'Audit Log',          icon: 'ti-file-description' },
  { id: 'health',    label: 'System Diagnostics', icon: 'ti-activity-heartbeat' },
]

export default function App() {
  const [page,    setPage]    = useState('dashboard')
  const [records, setRecords] = useState(SEED_RECORDS)

  const stats = {
    total:      records.length,
    clean:      records.filter(r => r.status === 'clean').length,
    exceptions: records.filter(r => r.status === 'exception').length,
    critical:   records.filter(r => r.status === 'critical').length,
    avgDays:    Math.round(
      records.filter(r => r.daysLeft !== null).reduce((s, r) => s + r.daysLeft, 0) /
      (records.filter(r => r.daysLeft !== null).length || 1)
    ),
  }

  const handleIngest = (rec) => setRecords(prev => [rec, ...prev])

  const handleResolve = (id) =>
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'clean', accuracy: 100, failures: [] } : r))

  const handleDismiss = (id) =>
    setRecords(prev => prev.filter(r => r.id !== id))

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'var(--surface)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Top bar */}
      <header style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--surface-container-low)',
        borderBottom: '1px solid var(--outline-dim)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-anchor" style={{ fontSize: 18, color: 'var(--primary)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>
            pyTan
          </span>
          <span style={{ fontSize: 12, color: 'var(--on-surface-muted)', fontWeight: 400 }}>
            / Demurrage Shield
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            padding: '3px 8px', borderRadius: 'var(--radius-full)',
            background: 'var(--color-success-bg)', color: 'var(--color-success)',
            border: '1px solid var(--color-success-border)',
            textTransform: 'uppercase',
          }}>Live</span>
          <span style={{ fontSize: 11, color: 'var(--on-surface-muted)' }}>USEC Freight Operations</span>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {page === 'dashboard' && (
          <Dashboard
            records={records}
            stats={stats}
            onIngest={handleIngest}
            onResolve={handleResolve}
            onDismiss={handleDismiss}
          />
        )}
        {page === 'logs'   && <Logs />}
        {page === 'health' && <Health />}
      </main>

      {/* Bottom navigation — matches screen.png */}
      <nav style={{
        height: 64, flexShrink: 0,
        display: 'flex', alignItems: 'stretch',
        background: 'var(--surface-container-low)',
        borderTop: '1px solid var(--outline-dim)',
      }}>
        {NAV.map(tab => {
          const active = page === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
                background: 'transparent', border: 'none',
                cursor: 'pointer', position: 'relative',
                transition: 'background 0.15s',
                borderTop: active ? '2px solid var(--primary)' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-container)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <i className={`ti ${tab.icon}`} style={{
                fontSize: 20,
                color: active ? 'var(--primary)' : 'var(--on-surface-muted)',
                transition: 'color 0.15s',
              }} />
              <span style={{
                fontSize: 10, fontWeight: active ? 600 : 400,
                color: active ? 'var(--primary)' : 'var(--on-surface-muted)',
                letterSpacing: '0.02em', transition: 'color 0.15s',
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
