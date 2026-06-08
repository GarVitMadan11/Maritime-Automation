import { useEffect, useRef, useState } from 'react'

function AnimatedNumber({ target }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0
    const step = Math.ceil(target / 30)
    const t = setInterval(() => {
      start = Math.min(start + step, target)
      setVal(start)
      if (start >= target) clearInterval(t)
    }, 20)
    return () => clearInterval(t)
  }, [target])
  return <>{val}</>
}

export function KpiHero({ stats }) {
  const chips = [
    { label: 'Total Processed', value: stats.total,      color: 'var(--on-surface)',      icon: 'ti-file-invoice' },
    { label: 'Draft Ready',     value: stats.clean,      color: 'var(--color-success)',   icon: 'ti-circle-check' },
    { label: 'Exceptions',      value: stats.exceptions, color: 'var(--color-exception)', icon: 'ti-alert-triangle' },
    { label: 'Critical',        value: stats.critical,   color: 'var(--color-error)',      icon: 'ti-flame' },
  ]

  return (
    <div className="fade-up" style={{
      background: 'var(--surface-container-low)',
      border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius-lg)',
      padding: '28px 32px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle teal gradient top-left */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, var(--primary) 0%, transparent 60%)',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        {/* Left — headline */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
            color: 'var(--primary-dim)', textTransform: 'uppercase', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className="ti ti-shield-check" style={{ fontSize: 12 }} />
            Demurrage Shield
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 700,
            color: 'var(--primary)', letterSpacing: '-0.03em', lineHeight: 1.05,
            marginBottom: 14,
          }}>
            <AnimatedNumber target={0} /> Missed Deadlines
          </h1>

          <p style={{ fontSize: 15, color: 'var(--on-surface-variant)', lineHeight: 1.6, maxWidth: 540 }}>
            <strong style={{ color: 'var(--on-surface)', fontWeight: 600 }}>5,000+ logistics emails</strong>{' '}
            parsed this month.{' '}
            <span style={{ color: 'var(--primary-dim)', fontWeight: 600 }}>$0 incurred</span>{' '}
            in port demurrage fines.
          </p>

          {/* Stat chips */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
            {chips.map((c, i) => (
              <div key={c.label} className={`fade-up-delay-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--surface-container)',
                border: '1px solid var(--outline-dim)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
              }}>
                <i className={`ti ${c.icon}`} style={{ fontSize: 13, color: c.color }} />
                <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{c.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: c.color, minWidth: 18, textAlign: 'right' }}>
                  {c.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Shield icon */}
        <div style={{
          flexShrink: 0, width: 72, height: 72,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%',
          background: 'var(--primary-glow)',
          border: '1px solid rgba(0,245,255,0.2)',
          animation: 'shield-pulse 3s ease-in-out infinite',
        }}>
          <i className="ti ti-shield-bolt" style={{
            fontSize: 36, color: 'var(--primary)',
          }} />
        </div>
      </div>
    </div>
  )
}
