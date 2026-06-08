const NODES = [
  { icon: 'ti-mail',          label: 'IMAP Inbox Intercept',      status: 'ok', latency: '12ms' },
  { icon: 'ti-scan',          label: 'Regex Extraction Engine',    status: 'ok', latency: '3ms'  },
  { icon: 'ti-shield-check',  label: 'ISO 6346 Validation Gate',  status: 'ok', latency: '1ms'  },
  { icon: 'ti-route',         label: 'JSONL Queue Router',        status: 'ok', latency: '2ms'  },
]

const METRICS = [
  { label: 'Pipeline Uptime',        value: '99.8%',   color: 'var(--color-success)' },
  { label: 'Avg. Processing Time',   value: '18ms',    color: 'var(--primary-dim)' },
  { label: 'Emails Ingested (MTD)',  value: '5,241',   color: 'var(--on-surface)' },

]

export function Health() {
  return (
    <div style={{ overflowY: 'auto', padding: 24, height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 4 }}>System Health</h1>
        <p style={{ fontSize: 13, color: 'var(--on-surface-muted)' }}>Real-time pipeline node diagnostics and performance metrics.</p>
      </div>

      {/* System status banner */}
      <div style={{
        padding: '20px 24px', marginBottom: 20,
        background: 'var(--color-success-bg)',
        border: '1px solid var(--color-success-border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: 'var(--color-success)',
          boxShadow: '0 0 12px var(--color-success)',
          animation: 'dot-blink 2s ease infinite',
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-success)', marginBottom: 2 }}>
            All System Nodes Operational
          </div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-muted)' }}>
            99.8% Core Pipeline Efficiency — No incidents in the last 30 days
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {METRICS.map(m => (
          <div key={m.label} style={{
            padding: '16px 20px',
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--on-surface-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: m.color, letterSpacing: '-0.02em' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Node list */}
      <div style={{
        background: 'var(--surface-container-low)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--outline-dim)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-topology-star" style={{ fontSize: 15, color: 'var(--primary-dim)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
            Pipeline Nodes
          </span>
        </div>
        {NODES.map((n, i) => (
          <div key={n.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: i > 0 ? '1px solid var(--outline-dim)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--radius-md)',
                background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ${n.icon}`} style={{ fontSize: 16, color: 'var(--color-success)' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--on-surface)' }}>{n.label}</div>
                <div style={{ fontSize: 11, color: 'var(--on-surface-muted)', fontFamily: 'var(--font-mono)' }}>latency: {n.latency}</div>
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '4px 10px',
              background: 'var(--color-success-bg)', color: 'var(--color-success)',
              border: '1px solid var(--color-success-border)', borderRadius: 'var(--radius-full)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>Operational</span>
          </div>
        ))}
      </div>
    </div>
  )
}
