import { useState } from 'react'

function JsonViewer({ record }) {
  const payload = {
    document_id: record.id,
    vessel: record.vessel,
    container_number: record.container ?? null,
    last_free_day: record.deadline ?? 'Flagged for Manual Review',
    data_extraction_confidence: record.confidence ?? null,
    exception_reason: record.reason ?? null,
    document_discrepancies: record.failures ?? [],
    status: 'Pending Manual Review',
  }
  const lines = JSON.stringify(payload, null, 2).split('\n')

  const colorLine = (line) => {
    if (line.includes('"') && line.includes(':')) {
      const [keyPart, ...rest] = line.split(':')
      const valPart = rest.join(':')
      const isNull = valPart.trim() === 'null,' || valPart.trim() === 'null'
      const isStr  = valPart.includes('"')
      const isNum  = /:\s*[\d.]+/.test(line)
      const valColor = isNull ? '#f87171' : isStr ? '#fbbf24' : isNum ? '#a78bfa' : 'var(--on-surface-variant)'
      return (
        <>
          <span style={{ color: '#00dce5' }}>{keyPart}</span>
          <span>:</span>
          <span style={{ color: valColor }}>{valPart}</span>
        </>
      )
    }
    return <span style={{ color: 'var(--on-surface-variant)' }}>{line}</span>
  }

  return (
    <pre style={{
      fontSize: 11.5, fontFamily: 'var(--font-mono)', lineHeight: 1.65,
      color: 'var(--on-surface-variant)', margin: 0, overflowX: 'auto',
      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    }}>
      {lines.map((line, i) => (
        <div key={i}>{colorLine(line)}</div>
      ))}
    </pre>
  )
}

export function ExceptionGate({ exceptions, onResolve, onDismiss }) {
  const [idx, setIdx] = useState(0)

  if (!exceptions || exceptions.length === 0) return (
    <div style={{
      background: 'var(--surface-container-low)',
      border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius-lg)',
      padding: '28px 32px',
    }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
        Demurrage Exception Desk &amp; Auditing Gate
      </h2>
      <p style={{ fontSize: 13, color: 'var(--on-surface-muted)' }}>
        Discrepancies identified in shipping documents requiring manual review.
      </p>
      <div style={{
        marginTop: 24, padding: '20px 24px', textAlign: 'center',
        background: 'var(--surface-container)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-success-border)',
        color: 'var(--color-success)', fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <i className="ti ti-circle-check" style={{ fontSize: 18 }} />
        All demurrage risks mitigated — exception queue clear
      </div>
    </div>
  )

  const current = exceptions[idx % exceptions.length]

  return (
    <div style={{
      background: 'var(--surface-container-low)',
      border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius-lg)',
      padding: '28px 32px',
    }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 6 }}>
            Demurrage Exception Desk &amp; Auditing Gate
          </h2>
          <p style={{ fontSize: 13, color: 'var(--on-surface-muted)' }}>
            Discrepancies identified in shipping documents requiring manual review.
          </p>
        </div>
        {exceptions.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setIdx(i => (i - 1 + exceptions.length) % exceptions.length)}
              style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', padding: '5px 10px', color: 'var(--on-surface-variant)', fontSize: 12 }}>
              <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--on-surface-muted)', display: 'flex', alignItems: 'center', padding: '0 6px' }}>
              {(idx % exceptions.length) + 1} / {exceptions.length}
            </span>
            <button onClick={() => setIdx(i => (i + 1) % exceptions.length)}
              style={{ background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', padding: '5px 10px', color: 'var(--on-surface-variant)', fontSize: 12 }}>
              <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
            </button>
          </div>
        )}
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' }}>
        {/* Left — visual + badge */}
        <div style={{
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          position: 'relative', minHeight: 260,
          background: 'linear-gradient(135deg, #061a1a 0%, #0a2a2a 40%, #051212 100%)',
          border: '1px solid var(--outline-dim)',
        }}>
          {/* Animated grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(0,245,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
          {/* Red alert blot */}
          <div style={{
            position: 'absolute', top: '40%', left: '45%',
            width: 60, height: 60, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(248,113,113,0.4) 0%, transparent 70%)',
          }} />
          {/* Teal scan lines */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,220,229,0.02) 4px)',
          }} />

          {/* Vessel label */}
          <div style={{
            position: 'absolute', top: 20, left: 20, right: 20,
          }}>
            <div style={{ fontSize: 10, color: 'rgba(0,220,229,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Flagged Vessel
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>
              {current.vessel}
            </div>
          </div>

          {/* Bottom badge */}
          <div style={{
            position: 'absolute', bottom: 20, left: 20, right: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              background: 'rgba(248,113,113,0.2)', color: '#f87171',
              border: '1px solid rgba(248,113,113,0.4)',
              borderRadius: 'var(--radius-sm)', padding: '4px 10px',
              textTransform: 'uppercase',
            }}>
              Low Confidence
            </span>
            <span style={{ fontSize: 11, color: 'var(--on-surface-muted)', fontFamily: 'var(--font-mono)' }}>
              Reference: {current.ref ?? current.id.slice(-8)}
            </span>
          </div>
        </div>

        {/* Right — JSON + actions */}
        <div style={{
          background: 'var(--surface-container)',
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Buffer header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--outline-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--primary-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Document Data Extraction Schema
            </span>
            <i className="ti ti-code" style={{ fontSize: 14, color: 'var(--on-surface-muted)' }} />
          </div>

          {/* JSON payload */}
          <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto' }}>
            <JsonViewer record={current} />
          </div>

          {/* Action buttons */}
          <div style={{
            padding: '14px 16px', borderTop: '1px solid var(--outline-dim)',
            display: 'flex', gap: 10,
          }}>
            <button
              onClick={() => { onResolve(current.id); setIdx(i => Math.max(0, i - 1)) }}
              style={{
                flex: 2, padding: '10px 0', fontWeight: 600, fontSize: 13,
                background: 'var(--on-surface)', color: 'var(--surface)',
                border: 'none', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Approve &amp; Release
            </button>
            <button
              onClick={() => { onDismiss(current.id); setIdx(i => Math.max(0, i - 1)) }}
              style={{
                flex: 1, padding: '10px 0', fontWeight: 500, fontSize: 13,
                background: 'transparent', color: 'var(--on-surface-variant)',
                border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--outline)'; e.currentTarget.style.color = 'var(--on-surface)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline-variant)'; e.currentTarget.style.color = 'var(--on-surface-variant)' }}
            >
              Reject &amp; Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
