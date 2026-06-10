import { useEffect, useState } from 'react'

// ── Google Calendar appointment scheduling link ─────────────────────────────
// Replace this with your actual Google Calendar appointment URL
const GCAL_LINK = 'https://calendar.google.com/calendar/appointments'

export function DemoCta() {
  const [visible, setVisible]   = useState(false)
  const [dismissed, setDismiss] = useState(
    () => sessionStorage.getItem('cta_dismissed') === '1'
  )

  useEffect(() => {
    if (dismissed) return
    // Appears after 3 minutes (180 000ms). Set to 10000ms for testing.
    const t = setTimeout(() => setVisible(true), 180_000)
    return () => clearTimeout(t)
  }, [dismissed])

  const handleDismiss = () => {
    sessionStorage.setItem('cta_dismissed', '1')
    setDismiss(true)
    setVisible(false)
  }

  if (dismissed || !visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 64, // sits above the bottom nav bar
      left: 0, right: 0, zIndex: 999,
      display: 'flex', justifyContent: 'center',
      padding: '0 16px',
      animation: 'slide-up-cta 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
    }}>
      <div style={{
        maxWidth: 760, width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
        background: 'rgba(21, 29, 29, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--outline-variant)',
        borderLeft: '3px solid var(--primary)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 20px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,245,255,0.06)',
      }}>
        {/* Left content */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'var(--primary-glow)',
            border: '1px solid rgba(0,245,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-calendar-event" style={{ fontSize: 16, color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 2 }}>
              Ready to see this with your actual freight data?
            </div>
            <div style={{ fontSize: 11, color: 'var(--on-surface-muted)' }}>
              A 20-minute call is all it takes to scope a live integration with your carrier emails.
            </div>
          </div>
        </div>

        {/* CTA Button + Dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <a
            href={GCAL_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 'var(--radius-md)',
              background: 'var(--primary)', color: 'var(--on-primary)',
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
              letterSpacing: '-0.01em',
              transition: 'filter 0.15s, transform 0.15s',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.12)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <i className="ti ti-calendar-plus" style={{ fontSize: 14 }} />
            Book 20-min Call
            <i className="ti ti-arrow-right" style={{ fontSize: 13 }} />
          </a>

          <button
            onClick={handleDismiss}
            title="Dismiss"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'transparent', border: '1px solid var(--outline-variant)',
              color: 'var(--on-surface-muted)', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-container)'; e.currentTarget.style.color = 'var(--on-surface)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-muted)' }}
          >
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>
      </div>
    </div>
  )
}
