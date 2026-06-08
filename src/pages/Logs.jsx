const LOG_ENTRIES = [
  { id: 'MDP-20260601-1120', ts: '2026-06-01T06:14:22Z', vessel: 'MSC MAYA',           status: 'clean',     fields: 4, routing: 'DASHBOARD_QUEUE' },
  { id: 'MDP-20260601-0988', ts: '2026-06-01T07:03:50Z', vessel: 'MAERSK ELBA',         status: 'exception', fields: 2, routing: 'EXCEPTION_QUEUE' },
  { id: 'MDP-20260602-3341', ts: '2026-06-02T08:22:11Z', vessel: 'CMA CGM MARCO POLO',  status: 'clean',     fields: 4, routing: 'DASHBOARD_QUEUE' },
  { id: 'MDP-20260602-4490', ts: '2026-06-02T09:47:33Z', vessel: 'ONE HARMONY',         status: 'clean',     fields: 4, routing: 'DASHBOARD_QUEUE' },
  { id: 'MDP-20260603-5501', ts: '2026-06-03T10:11:05Z', vessel: 'ZIM VIRGINIA',        status: 'exception', fields: 1, routing: 'EXCEPTION_QUEUE' },
  { id: 'MDP-20260603-6610', ts: '2026-06-03T11:30:44Z', vessel: 'EVER ACE',            status: 'clean',     fields: 4, routing: 'DASHBOARD_QUEUE' },
  { id: 'MDP-20260604-7732', ts: '2026-06-04T12:00:18Z', vessel: 'HL KOBE',             status: 'clean',     fields: 4, routing: 'DASHBOARD_QUEUE' },
  { id: 'MDP-20260604-8891', ts: '2026-06-04T13:44:29Z', vessel: 'YM UNANIMITY',        status: 'exception', fields: 2, routing: 'EXCEPTION_QUEUE' },
]

function fmt(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function Logs() {
  const COL = '190px 1fr 90px 90px 150px'
  const headers = ['Timestamp', 'Vessel', 'Fields', 'Status', 'Routing']

  return (
    <div style={{ overflowY: 'auto', padding: 24, height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 4 }}>Pipeline Logs</h1>
        <p style={{ fontSize: 13, color: 'var(--on-surface-muted)' }}>Historical record of all pipeline executions — last 30 days.</p>
      </div>

      <div style={{
        background: 'var(--surface-container-low)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: COL, gap: 12,
          padding: '10px 20px', background: 'var(--surface-container)',
          borderBottom: '1px solid var(--outline-dim)',
        }}>
          {headers.map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--on-surface-muted)', textTransform: 'uppercase' }}>
              {h}
            </span>
          ))}
        </div>

        {LOG_ENTRIES.map((r, i) => (
          <div key={r.id} style={{
            display: 'grid', gridTemplateColumns: COL, gap: 12,
            padding: '12px 20px', alignItems: 'center',
            borderBottom: i < LOG_ENTRIES.length - 1 ? '1px solid var(--outline-dim)' : 'none',
          }}>
            <span style={{ fontSize: 11, color: 'var(--on-surface-muted)', fontFamily: 'var(--font-mono)' }}>{fmt(r.ts)}</span>
            <span style={{ fontSize: 13, color: 'var(--on-surface)', fontWeight: 500 }}>{r.vessel}</span>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: r.fields < 4 ? 'var(--color-error)' : 'var(--color-success)' }}>
              {r.fields}/4
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-full)',
              background: r.status === 'exception' ? 'var(--color-exception-bg)' : 'var(--color-success-bg)',
              color: r.status === 'exception' ? 'var(--color-exception)' : 'var(--color-success)',
              border: `1px solid ${r.status === 'exception' ? 'var(--color-exception-border)' : 'var(--color-success-border)'}`,
              width: 'fit-content',
            }}>
              {r.status === 'exception' ? 'Exception' : 'Clean'}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--on-surface-muted)' }}>{r.routing}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
