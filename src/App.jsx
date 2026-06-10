import { useEffect, useRef, useState } from 'react'
import { SEED_RECORDS } from './data/seed.js'
import { Dashboard }   from './pages/Dashboard.jsx'
import { Logs }        from './pages/Logs.jsx'
import { Health }      from './pages/Health.jsx'
import { DemoCta }     from './components/DemoCta.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',          icon: 'ti-layout-dashboard' },
  { id: 'logs',      label: 'Audit Log',          icon: 'ti-file-description' },
  { id: 'health',    label: 'System Diagnostics', icon: 'ti-activity-heartbeat' },
]

// ── GAP 4: Urgency Ticker ───────────────────────────────────────────────────
// Base: JOC/Drewry 2024 — ~$1.8B/year avoidable US importer demurrage
// Prorated to MTD starting value, then increments every ~3s
function UrgencyTicker() {
  const now         = new Date()
  const dayOfMonth  = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const mtdBase     = Math.round((1_800_000_000 / 12) * (dayOfMonth / daysInMonth))

  const [amount, setAmount] = useState(mtdBase)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      // Accrues $1,200–$3,800 every 3 seconds
      setAmount(prev => prev + Math.floor(Math.random() * 2600 + 1200))
    }, 3000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(amount)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 12px',
      background: 'rgba(251,191,36,0.06)',
      border: '1px solid rgba(251,191,36,0.15)',
      borderRadius: 'var(--radius-full)',
    }}>
      <i className="ti ti-alert-triangle" style={{ fontSize: 11, color: 'var(--color-warning)', flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: 'var(--on-surface-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>
        US shippers paid&nbsp;
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-warning)', fontWeight: 700 }}>
          {formatted}
        </span>
        &nbsp;in avoidable demurrage this month
      </span>
    </div>
  )
}

// ── GAP 3: Prospect Name Badge ──────────────────────────────────────────────
function ProspectBadge({ clientName, onChange }) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef(null)

  const handleClick = () => {
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 10)
  }

  const handleBlur = () => setEditing(false)

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={clientName}
        onChange={e => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Type prospect name…"
        style={{
          fontSize: 11, fontWeight: 600,
          background: 'rgba(0,245,255,0.06)',
          border: '1px solid var(--primary-dim)',
          borderRadius: 'var(--radius-full)',
          padding: '3px 12px', color: 'var(--primary)',
          outline: 'none', minWidth: 160, maxWidth: 220,
          letterSpacing: '0.02em',
        }}
      />
    )
  }

  if (clientName) {
    return (
      <button
        onClick={handleClick}
        title="Click to edit prospect name"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          padding: '3px 12px', borderRadius: 'var(--radius-full)',
          background: 'rgba(251,191,36,0.10)', color: 'var(--color-warning)',
          border: '1px solid rgba(251,191,36,0.25)',
          cursor: 'pointer', textTransform: 'uppercase',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.18)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,191,36,0.10)'}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--color-warning)',
          animation: 'dot-blink 2s ease infinite',
          display: 'inline-block',
        }} />
        Demo Mode: {clientName}
        <i className="ti ti-edit" style={{ fontSize: 10, opacity: 0.7 }} />
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      title="Personalize this demo"
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, color: 'var(--on-surface-muted)',
        background: 'transparent', border: '1px dashed var(--outline-variant)',
        borderRadius: 'var(--radius-full)', padding: '3px 12px',
        cursor: 'pointer', letterSpacing: '0.02em',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--on-surface-variant)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline-variant)'; e.currentTarget.style.color = 'var(--on-surface-muted)' }}
    >
      <i className="ti ti-user-plus" style={{ fontSize: 11 }} />
      Enter prospect name
    </button>
  )
}

// ── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [page,       setPage]       = useState('dashboard')
  const [records,    setRecords]    = useState(SEED_RECORDS)
  const [clientName, setClientName] = useState('')

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

  const handleIngest  = (rec) => setRecords(prev => [rec, ...prev])
  const handleResolve = (id)  => setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'clean', accuracy: 100, failures: [] } : r))
  const handleDismiss = (id)  => setRecords(prev => prev.filter(r => r.id !== id))

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'var(--surface)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* ── Top bar ── */}
      <header style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--surface-container-low)',
        borderBottom: '1px solid var(--outline-dim)',
        gap: 12, flexWrap: 'wrap',
        minHeight: 52,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <i className="ti ti-anchor" style={{ fontSize: 18, color: 'var(--primary)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>
            pyTan
          </span>
          <span style={{ fontSize: 12, color: 'var(--on-surface-muted)', fontWeight: 400 }}>
            / Demurrage Shield
          </span>
        </div>

        {/* Centre — Urgency Ticker (GAP 4) */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0, overflow: 'hidden' }}>
          <UrgencyTicker />
        </div>

        {/* Right — Prospect Badge (GAP 3) + Live pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ProspectBadge clientName={clientName} onChange={setClientName} />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            padding: '3px 8px', borderRadius: 'var(--radius-full)',
            background: 'var(--color-success-bg)', color: 'var(--color-success)',
            border: '1px solid var(--color-success-border)',
            textTransform: 'uppercase',
          }}>Live</span>
        </div>
      </header>

      {/* ── Page content ── */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {page === 'dashboard' && (
          <Dashboard
            records={records}
            stats={stats}
            clientName={clientName}
            onIngest={handleIngest}
            onResolve={handleResolve}
            onDismiss={handleDismiss}
          />
        )}
        {page === 'logs'   && <Logs />}
        {page === 'health' && <Health />}
      </main>

      {/* ── Bottom navigation ── */}
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

      {/* ── Sticky CTA (GAP 6) — mounts over all pages ── */}
      <DemoCta />
    </div>
  )
}
