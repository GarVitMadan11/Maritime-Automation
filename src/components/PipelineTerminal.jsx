import { useEffect, useRef, useState } from 'react'
import { DEMO_EMAILS, buildPipelineSteps } from '../data/seed.js'

export function PipelineTerminal({ onIngest }) {
  const [logs, setLogs]       = useState([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [demoIdx, setDemoIdx] = useState(0)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const runSimulation = async () => {
    if (running) return
    if (!DEMO_EMAILS || DEMO_EMAILS.length === 0) return
    const email = DEMO_EMAILS[demoIdx % DEMO_EMAILS.length]
    setRunning(true)
    setLogs([])
    setProgress(0)

    const steps = buildPipelineSteps(email)
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]
      await new Promise(r => setTimeout(r, s.ms))
      setLogs(prev => [...prev, s])
      setProgress(Math.round(((i + 1) / steps.length) * 100))
    }

    // Build record and push to feed
    const newRecord = {
      id: `MDP-${Date.now().toString().slice(-8)}`,
      ts: new Date().toISOString(),
      vessel: email.vessel,
      container: email.container,
      pod: email.pod,
      deadline: email.deadline,
      status: email.status,
      carrier: email.carrier,
      daysLeft: email.daysLeft,
      doc: email.doc,
      accuracy: email.accuracy,
      failures: email.failures,
      ref: email.ref,
      confidence: email.confidence,
      reason: email.reason,
    }
    onIngest(newRecord)
    setDemoIdx(i => i + 1)
    setRunning(false)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--surface-container-low)',
      border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--outline-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-terminal-2" style={{ fontSize: 15, color: 'var(--primary-dim)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
            Document Ingestion Port
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: running ? 'var(--color-warning)' : 'var(--color-success)',
            animation: running ? 'dot-blink 0.8s ease infinite' : 'none',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 10, color: 'var(--on-surface-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {running ? 'Running' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'var(--outline-dim)', flexShrink: 0 }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(90deg, var(--primary-dim), var(--primary))',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Log area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '14px 16px',
        fontFamily: 'var(--font-mono)', fontSize: 11.5,
        background: '#060f0f', lineHeight: 1.7,
      }}>
        {logs.length === 0 && !running && (
          <span style={{ color: '#3a5050' }}>
            {`// `}Awaiting incoming document email…<span style={{ animation: 'blink-cursor 1.2s step-end infinite', display: 'inline-block', marginLeft: 2 }}>▋</span>
          </span>
        )}
        {logs.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 4, alignItems: 'flex-start' }}>
            <i className={`ti ${l.icon}`} style={{ fontSize: 12, color: l.color, flexShrink: 0, marginTop: 2 }} />
            <span style={{ color: '#8fb8b8' }}>{l.msg}</span>
          </div>
        ))}
        {running && (
          <span style={{ color: 'var(--color-warning)', display: 'inline-block', marginTop: 4 }}>
            <span style={{ animation: 'blink-cursor 0.7s step-end infinite' }}>▋</span>
          </span>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Run button */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--outline-dim)', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--on-surface-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>
          NEXT: {DEMO_EMAILS.length > 0 ? DEMO_EMAILS[demoIdx % DEMO_EMAILS.length]?.subject : '—'}
        </div>
        <button
          onClick={runSimulation}
          disabled={running || DEMO_EMAILS.length === 0}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '9px 0',
            background: (running || DEMO_EMAILS.length === 0) ? 'var(--surface-container)' : 'var(--primary)',
            color: (running || DEMO_EMAILS.length === 0) ? 'var(--on-surface-muted)' : 'var(--on-primary)',
            border: 'none', borderRadius: 'var(--radius-md)',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.03em',
            transition: 'all 0.2s',
            cursor: (running || DEMO_EMAILS.length === 0) ? 'not-allowed' : 'pointer',
          }}
        >
          <i className={`ti ${running ? 'ti-loader-2' : 'ti-player-play-filled'}`}
            style={{ fontSize: 13, animation: running ? 'spin 1s linear infinite' : 'none' }} />
          {running ? 'Processing…' : 'Simulate Incoming Arrival Notice →'}
        </button>
      </div>
    </div>
  )
}
