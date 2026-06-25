import { useState } from 'react'
import { KpiHero }            from '../components/KpiHero.jsx'
import { RoiCalculator }      from '../components/RoiCalculator.jsx'
import { LiveFeed }           from '../components/LiveFeed.jsx'
import { PipelineTerminal }   from '../components/PipelineTerminal.jsx'
import { ExceptionGate }      from '../components/ExceptionGate.jsx'
import { RecordDetail }       from '../components/RecordDetail.jsx'
import { DocumentDropZone }   from '../components/DocumentDropZone.jsx'
import { useReplayFeed }      from '../hooks/useReplayFeed.js'

export function Dashboard({ records, stats, clientName, onIngest, onResolve, onDismiss }) {
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')

  // GAP 2 — Replay mode: keeps the feed alive when idle
  const { displayRecords, isReplaying } = useReplayFeed(records)

  const exceptions = records.filter(r => r.status === 'exception')

  const handleIngest = (rec) => {
    onIngest(rec)
    setSelected(rec)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main scrollable column */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* KPI Hero */}
        <KpiHero stats={stats} clientName={clientName} />

        {/* GAP 1 — ROI Calculator */}
        <RoiCalculator />

        {/* Live Feed + Right sidebar (Drop Zone + Terminal) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          <div style={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
            <LiveFeed
              records={displayRecords}
              selected={selected}
              onSelect={setSelected}
              filter={filter}
              onFilterChange={setFilter}
              search={search}
              onSearchChange={setSearch}
              isReplaying={isReplaying}
            />
          </div>
          {/* Right column: Document Drop Zone + Pipeline Terminal stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <DocumentDropZone onIngest={handleIngest} />
            <div style={{ height: 380, display: 'flex', flexDirection: 'column' }}>
              <PipelineTerminal onIngest={handleIngest} />
            </div>
          </div>
        </div>

        {/* Exception Gate */}
        <ExceptionGate exceptions={exceptions} onResolve={onResolve} onDismiss={onDismiss} />

        {/* Bottom padding */}
        <div style={{ height: 8 }} />
      </div>

      {/* Sliding detail panel */}
      <div style={{
        width: selected ? 340 : 0,
        overflow: 'hidden',
        borderLeft: selected ? '1px solid var(--outline-dim)' : 'none',
        background: 'var(--surface-container-low)',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
      }}>
        <div style={{ width: 340, height: '100%' }}>
          <RecordDetail
            record={selected}
            onClose={() => setSelected(null)}
            onResolve={onResolve}
            onDismiss={onDismiss}
          />
        </div>
      </div>
    </div>
  )
}
