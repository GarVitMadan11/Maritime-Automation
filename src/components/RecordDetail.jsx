import { CARRIER_COLORS } from '../data/seed.js'

const STATUS_LABELS = {
  clean:    { label: 'Auto-Approved',  color: 'var(--color-success)',   bg: 'var(--color-success-bg)',   border: 'var(--color-success-border)' },
  urgent:   { label: 'Urgent (<3d)',   color: 'var(--color-warning)',   bg: 'var(--color-warning-bg)',   border: 'var(--color-warning-border)' },
  critical: { label: 'At Risk (<2d)',  color: 'var(--color-error)',     bg: 'var(--color-error-bg)',     border: 'var(--color-error-border)' },
  exception:{ label: 'Manual Review',  color: 'var(--color-exception)', bg: 'var(--color-exception-bg)', border: 'var(--color-exception-border)' },
}

function daysColor(d) {
  if (d === null || d === undefined) return 'var(--color-exception)'
  if (d <= 2) return 'var(--color-error)'
  if (d <= 4) return 'var(--color-warning)'
  return 'var(--color-success)'
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function PipelineStep({ icon, label, done, failed, last }) {
  const c = failed ? 'var(--color-error)' : done ? 'var(--color-success)' : 'var(--on-surface-muted)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', flex: last ? 'none' : 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: failed ? 'var(--color-error-bg)' : done ? 'var(--color-success-bg)' : 'var(--surface-container)',
          border: `1px solid ${failed ? 'var(--color-error-border)' : done ? 'var(--color-success-border)' : 'var(--outline-dim)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 13, color: c }} />
        </div>
        <span style={{ fontSize: 9, color: 'var(--on-surface-muted)', textAlign: 'center', maxWidth: 56, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>
      {!last && <div style={{ flex: 1, height: 1, background: 'var(--outline-dim)', margin: '0 4px', marginBottom: 14 }} />}
    </div>
  )
}

export function RecordDetail({ record, onClose, onResolve, onDismiss }) {
  if (!record) return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      color: 'var(--on-surface-muted)', padding: 32,
    }}>
      <i className="ti ti-click" style={{ fontSize: 40, opacity: 0.2 }} />
      <span style={{ fontSize: 13 }}>Select a record to inspect</span>
    </div>
  )

  const sm = STATUS_LABELS[record.status] ?? STATUS_LABELS.clean
  const carrierColor = CARRIER_COLORS[record.carrier] ?? '#555'
  const isException = record.status === 'exception'

  const fields = [
    { icon: 'ti-ship',     label: 'Vessel / Voyage',     val: record.vessel,                        mono: false },
    { icon: 'ti-box',      label: 'Container Number',    val: record.container ?? 'NOT FOUND',      mono: true,  missing: !record.container },
    { icon: 'ti-anchor',   label: 'Port of Discharge',   val: record.pod ?? '—',                   mono: false },
    { icon: 'ti-calendar', label: 'Last Free Day (LFD)', val: fmt(record.deadline),                 mono: false, missing: !record.deadline },
    { icon: 'ti-clock',    label: 'Received At',         val: `${fmt(record.ts)} · ${fmtTime(record.ts)} UTC`, mono: false },
  ]

  const steps = [
    { icon: 'ti-mail-opened',  label: 'Received',     done: true },
    { icon: 'ti-scan',         label: 'Parsed',       done: !!record.vessel },
    { icon: 'ti-shield-check', label: 'Audited',      done: true, failed: isException },
    { icon: 'ti-route',        label: isException ? 'Escalated' : 'Released', done: true, last: true },
  ]

  return (
    <div style={{
      height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column',
      animation: 'slide-in-right 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--outline-dim)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '3px 8px',
                background: carrierColor, color: '#fff',
                borderRadius: 'var(--radius-sm)', letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>{record.carrier}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '3px 8px',
                background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`,
                borderRadius: 'var(--radius-sm)',
              }}>{sm.label}</span>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--on-surface)', letterSpacing: '-0.01em', marginBottom: 2 }}>{record.vessel}</h2>
            <p style={{ fontSize: 10, color: 'var(--on-surface-muted)', fontFamily: 'var(--font-mono)' }}>{record.id}</p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--surface-container)', border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-md)', padding: '5px 9px',
            color: 'var(--on-surface-variant)', cursor: 'pointer',
          }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Demurrage risk */}
        <div style={{
          padding: '14px 16px', borderRadius: 'var(--radius-md)',
          background: isException ? 'var(--color-exception-bg)' : record.daysLeft <= 2 ? 'var(--color-error-bg)' : record.daysLeft <= 4 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
          border: `1px solid ${isException ? 'var(--color-exception-border)' : record.daysLeft <= 2 ? 'var(--color-error-border)' : record.daysLeft <= 4 ? 'var(--color-warning-border)' : 'var(--color-success-border)'}`,
        }}>
          <div style={{ fontSize: 10, color: 'var(--on-surface-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Demurrage Liability</div>
          {isException ? (
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-exception)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 15 }} />
              Last Free Day unknown — demurrage clock may be active
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: daysColor(record.daysLeft), letterSpacing: '-0.02em' }}>
                {record.daysLeft}d
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--on-surface)' }}>until Last Free Day (LFD)</div>
                <div style={{ fontSize: 11, color: 'var(--on-surface-muted)' }}>LFD: {fmt(record.deadline)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Fields */}
        <div style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-dim)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {fields.map((f, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '28px 130px 1fr', alignItems: 'center',
              gap: 8, padding: '10px 14px',
              borderTop: i > 0 ? '1px solid var(--outline-dim)' : 'none',
            }}>
              <i className={`ti ${f.icon}`} style={{ fontSize: 14, color: 'var(--on-surface-muted)' }} />
              <span style={{ fontSize: 11, color: 'var(--on-surface-muted)' }}>{f.label}</span>
              <span style={{
                fontSize: 12, fontWeight: 500,
                fontFamily: f.mono ? 'var(--font-mono)' : 'inherit',
                color: f.missing ? 'var(--color-error)' : 'var(--on-surface)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{f.val}</span>
            </div>
          ))}
        </div>

        {/* Validation failures */}
        {isException && record.failures && (
          <div style={{ padding: '12px 14px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-error)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 13 }} />
              Document Discrepancies
            </div>
            {record.failures.map((f, i) => (
              <div key={i} style={{
                fontSize: 11, color: 'var(--color-error)', fontFamily: 'var(--font-mono)',
                padding: '5px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: 4,
              }}>[{i + 1}] {f}</div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--color-error)', marginTop: 8, fontWeight: 500 }}>
              → Route to operations lead. Cross-reference with Bill of Lading (BOL) manually.
            </div>
          </div>
        )}

        {/* Document Audit Trail */}
        <div style={{ padding: '12px 14px', background: 'var(--surface-container)', border: '1px solid var(--outline-dim)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 10, color: 'var(--on-surface-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document Audit Trail</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {steps.map((s, i) => <PipelineStep key={i} {...s} last={s.last} />)}
          </div>
        </div>

        {/* Actions for exceptions */}
        {isException && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { onResolve(record.id); onClose() }} style={{
              flex: 2, padding: '9px 0', fontWeight: 600, fontSize: 12,
              background: 'var(--on-surface)', color: 'var(--surface)',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            }}>Approve &amp; Release</button>
            <button onClick={() => { onDismiss(record.id); onClose() }} style={{
              flex: 1, padding: '9px 0', fontWeight: 500, fontSize: 12,
              background: 'transparent', color: 'var(--on-surface-variant)',
              border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
            }}>Reject &amp; Archive</button>
          </div>
        )}
      </div>
    </div>
  )
}
