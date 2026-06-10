import { useState, useCallback } from 'react'

function formatDollar(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function RoiCalculator() {
  const [containers, setContainers] = useState(200)
  const [ratePerUnit, setRatePerUnit] = useState(850)

  // ~73% reduction rate (Drewry Port Productivity / JOC 2024 benchmark)
  const SAVINGS_RATE  = 0.73
  const MONTHLY_COST  = 1490 // implied SaaS cost used for ROI multiplier

  const annualExposure = containers * ratePerUnit * 12
  const annualSavings  = Math.round(annualExposure * SAVINGS_RATE)
  const roiMultiplier  = Math.round(annualSavings / (MONTHLY_COST * 12))

  const handleContainers = useCallback((e) => {
    const v = Math.max(1, Math.min(5000, Number(e.target.value) || 1))
    setContainers(v)
  }, [])

  const handleRate = useCallback((e) => {
    const v = Math.max(100, Math.min(10000, Number(e.target.value) || 100))
    setRatePerUnit(v)
  }, [])

  return (
    <div style={{
      background: 'var(--surface-container-low)',
      border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px 28px',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, var(--color-warning) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            color: 'var(--color-warning)', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
          }}>
            <i className="ti ti-calculator" style={{ fontSize: 12 }} />
            ROI Calculator
          </div>
          <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: 0 }}>
            See your potential annual savings with Demurrage Shield
          </p>
        </div>
        <div style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', padding: '3px 10px',
          borderRadius: 'var(--radius-full)', textTransform: 'uppercase',
          background: 'rgba(251,191,36,0.08)', color: 'var(--color-warning)',
          border: '1px solid rgba(251,191,36,0.2)',
        }}>
          Drewry 2024 Benchmark
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>

        {/* Inputs column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Containers input */}
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)',
              marginBottom: 8, letterSpacing: '0.03em',
            }}>
              <span><i className="ti ti-container" style={{ marginRight: 6, color: 'var(--primary-dim)' }} />Avg. Containers / Month</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--primary)', fontWeight: 700 }}>
                {containers.toLocaleString()}
              </span>
            </label>
            <input
              type="range" min={10} max={2000} step={10}
              value={containers} onChange={handleContainers}
              style={{
                width: '100%', height: 4, borderRadius: 2, cursor: 'pointer',
                appearance: 'none', background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(containers/2000)*100}%, var(--outline-variant) ${(containers/2000)*100}%, var(--outline-variant) 100%)`,
                border: 'none', padding: 0, outline: 'none', boxShadow: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--on-surface-muted)' }}>10</span>
              <span style={{ fontSize: 10, color: 'var(--on-surface-muted)' }}>2,000</span>
            </div>
          </div>

          {/* Rate input */}
          <div>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)',
              marginBottom: 8, letterSpacing: '0.03em',
            }}>
              <span><i className="ti ti-cash" style={{ marginRight: 6, color: 'var(--primary-dim)' }} />Avg. Demurrage Cost / Container</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--primary)', fontWeight: 700 }}>
                {formatDollar(ratePerUnit)}
              </span>
            </label>
            <input
              type="range" min={100} max={5000} step={50}
              value={ratePerUnit} onChange={handleRate}
              style={{
                width: '100%', height: 4, borderRadius: 2, cursor: 'pointer',
                appearance: 'none', background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((ratePerUnit-100)/4900)*100}%, var(--outline-variant) ${((ratePerUnit-100)/4900)*100}%, var(--outline-variant) 100%)`,
                border: 'none', padding: 0, outline: 'none', boxShadow: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--on-surface-muted)' }}>$100</span>
              <span style={{ fontSize: 10, color: 'var(--on-surface-muted)' }}>$5,000</span>
            </div>
          </div>
        </div>

        {/* Output column */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
          alignItems: 'start',
        }}>
          {/* Annual Exposure */}
          <div style={{
            background: 'var(--surface-container)', border: '1px solid var(--outline-dim)',
            borderRadius: 'var(--radius-md)', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--on-surface-muted)', textTransform: 'uppercase' }}>
              Annual Exposure
            </span>
            <span style={{
              fontSize: 18, fontWeight: 700, color: 'var(--color-error)',
              fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              {formatDollar(annualExposure)}
            </span>
            <span style={{ fontSize: 10, color: 'var(--on-surface-muted)' }}>at current spend rate</span>
          </div>

          {/* Annual Savings */}
          <div style={{
            background: 'rgba(74,222,128,0.05)', border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-md)', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--color-success)', textTransform: 'uppercase' }}>
              Est. Annual Savings
            </span>
            <span style={{
              fontSize: 18, fontWeight: 700, color: 'var(--color-success)',
              fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              {formatDollar(annualSavings)}
            </span>
            <span style={{ fontSize: 10, color: 'var(--on-surface-muted)' }}>73% avg. reduction</span>
          </div>

          {/* ROI */}
          <div style={{
            background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)',
            borderRadius: 'var(--radius-md)', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--primary-dim)', textTransform: 'uppercase' }}>
              Return on Investment
            </span>
            <span style={{
              fontSize: 28, fontWeight: 700, color: 'var(--primary)',
              fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}>
              {roiMultiplier}×
            </span>
            <span style={{ fontSize: 10, color: 'var(--on-surface-muted)' }}>vs. Shield cost</span>
          </div>
        </div>
      </div>

      {/* Fine print */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--outline-dim)' }}>
        <p style={{ fontSize: 10, color: 'var(--on-surface-muted)', lineHeight: 1.6 }}>
          Savings estimate based on Drewry Port Productivity Report (2024) — US East & West Coast shippers average 73% demurrage reduction after automated LFD monitoring adoption. Actual results vary.
        </p>
      </div>
    </div>
  )
}
