// Dashboard — Main page matching the screenshot layout exactly
import { useState } from 'react'
import { KpiHero }          from '../components/KpiHero.jsx'
import { LiveFeed }         from '../components/LiveFeed.jsx'
import { ExceptionGate }    from '../components/ExceptionGate.jsx'
import { PipelineTerminal } from '../components/PipelineTerminal.jsx'
import { RecordDetail }     from '../components/RecordDetail.jsx'
import styles from './Dashboard.module.css'

export function Dashboard({ records, selected, setSelected, ingest, resolve, dismiss, stats, pipeline }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const exceptions = records.filter(r => ['exception', 'low_confidence'].includes(r.status))

  return (
    <div className={styles.layout}>
      {/* ── Main content column ── */}
      <div className={styles.main}>
        <div className={styles.scroll}>

          {/* 1. KPI Hero */}
          <KpiHero stats={stats} />

          {/* 2. Live Feed + Pipeline Terminal */}
          <div className={styles.feedRow}>
            <div className={styles.feedCol}>
              <LiveFeed
                records={records}
                selected={selected}
                onSelect={setSelected}
                filter={filter}
                onFilterChange={setFilter}
                search={search}
                onSearchChange={setSearch}
              />
            </div>
            <div className={styles.terminalCol}>
              <PipelineTerminal
                running={pipeline.running}
                logs={pipeline.logs}
                progress={pipeline.progress}
                onRun={pipeline.run}
              />
            </div>
          </div>

          {/* 3. Exception Gate */}
          <ExceptionGate
            exceptions={exceptions}
            onResolve={resolve}
            onDismiss={dismiss}
          />

        </div>
      </div>

      {/* ── Right detail panel ── */}
      <div className={`${styles.detail} ${selected ? styles.detailOpen : ''}`}>
        <RecordDetail
          record={selected}
          onClose={() => setSelected(null)}
          onResolve={resolve}
          onDismiss={dismiss}
        />
      </div>
    </div>
  )
}
