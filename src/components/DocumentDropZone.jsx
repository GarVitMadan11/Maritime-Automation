import { useState, useRef, useEffect, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Use the local worker bundled with the package — avoids CDN version mismatch
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

async function extractTextFromPDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageTexts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Group items by Y-position so table rows stay on separate lines
    const lineMap = {}
    for (const item of content.items) {
      if (!item.str.trim()) continue
      const y = Math.round(item.transform[5])
      if (!lineMap[y]) lineMap[y] = []
      lineMap[y].push(item.str)
    }
    // Sort top-to-bottom (higher Y = higher on page in PDF coords)
    const sorted = Object.keys(lineMap)
      .map(Number)
      .sort((a, b) => b - a)
      .map(y => lineMap[y].join(' '))
    pageTexts.push(sorted.join('\n'))
  }
  return pageTexts.join('\n')
}

// ── In-browser logistics field extractor ─────────────────────────────────────
// Mirrors maritime_demurrage_shield.py EXTRACTION_PATTERNS exactly.
function extractLogisticsFields(text) {
  const patterns = {
    vessel_name: [
      // Standard: "Vessel Name: MSC MAYA"
      /(?:Vessel(?:\s*Name)?|V\/V)\s*[:\-]\s*([A-Z0-9][A-Z0-9 \-]+?)(?:\n|,|;|\(|$)/im,
      // Carrier-prefix pattern — works for all major liners in any layout
      // Matches: "MSC GULSUN", "MAERSK ELBA", "EVER GIVEN", "CMA CGM MARCO POLO"
      /\b((?:MSC|MAERSK|EVER|CMA\s+CGM?|ONE|ZIM|HAPAG|HL|YM\s+\w+|COSCO|YANG\s+MING|APL|OOCL|PIL|HMM|HYUNDAI)\s+[A-Z][A-Z]{2,}(?:\s+[A-Z]{2,})*)/i,
      // Tabular: "VESSEL NAME" header then value on next line, skip BL number prefix
      /VESSEL\s*NAME[^\n]*\n\w+\s+([A-Z]{3,}(?:\s+[A-Z]{2,})+?)(?:\s{2,}|\n|$)/im,
    ],
    container_id: [
      /\b([A-Z]{4}\s?\d{6,7})\b/,
    ],
    port_of_discharge: [
      // Standard: "Port of Discharge: NEW YORK" or "POD: SAVANNAH"
      /(?:Port\s*of\s*Discharge|POD|Discharge\s*Port)\s*[:\-]\s*([A-Z][A-Za-z\s,]+?)(?:\n|;|$)/im,
      // Tabular same-line: "PORT OF DISCHARGE   NORFOLK, VA, USA"
      /PORT\s+OF\s+DISCHARGE\s+([A-Z][A-Za-z\s,\.]+?)(?:\s{2,}|\n|EST\.|ETA|VOYAGE|$)/im,
      // Tabular multi-line: header row then value row
      // Header: "PORT OF LOADING  PORT OF DISCHARGE  EST. ARRIVAL"
      // Values: "FELIXSTOWE, UK   NORFOLK, VA, USA   July 10, 2025"
      // Skip the PORT OF LOADING value ("CITY, COUNTRY ") then capture POD
      /PORT\s+OF\s+DISCHARGE[^\n]*\n(?:[A-Z][A-Za-z ,\.]+?,\s*[A-Z]{2,}\s+)?([A-Z][A-Za-z\s,\.]{3,40}?)(?:\s{2,}|\n|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d\d|$)/im,
    ],
    free_time_deadline: [
      // Standard: "Free Time Expires: 2025-08-15" or "Free Time Deadline: Aug 15, 2025"
      /(?:Free\s*Time\s*(?:Expires?|Deadline|Expiry|Allowed\s*Until)|Free\s*Days\s*Until)\s*[:\-]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/im,
      // LFD / Last Free Day (MSC, Maersk, CMA CGM notices)
      /(?:LAST\s*FREE\s*DAY(?:\s*\(LFD\))?|L\.?F\.?D\.?)\s*[:\-]\s*(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/im,
      // "Cargo Cutoff / Free Time Expiry: date"
      /FREE\s*TIME\s*EXPIR[EY]\s*[:\-]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/im,
    ],
  }

  const result = {}
  for (const [field, pats] of Object.entries(patterns)) {
    let val = null
    for (const pat of pats) {
      const m = text.match(pat)
      if (m) {
        val = m[1].trim()
        if (field === 'container_id') val = val.replace(/\s/g, '')
        break
      }
    }
    result[field] = val
  }
  return result
}

function validateFields(fields) {
  const failures = []
  const containerOk = fields.container_id && /^[A-Z]{4}\d{6,7}$/.test(fields.container_id)
  if (!fields.container_id)    failures.push("container_id: field not found in document")
  else if (!containerOk)       failures.push(`container_id: '${fields.container_id}' fails ISO 6346 format (expected 4 alpha + 6-7 digits)`)
  if (!fields.free_time_deadline) failures.push("free_time_deadline: field not found — CRITICAL: demurrage exposure unknown")
  return failures
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  return Math.ceil((d - Date.now()) / 86_400_000)
}

function guessCarrier(cid) {
  if (!cid) return 'UNKNOWN'
  const pfx = cid.slice(0, 4).toUpperCase()
  const MAP = {
    MSCU: 'MSC', MAEU: 'MAERSK', CMAU: 'CMA CGM',
    ONEU: 'ONE', HLCU: 'HAPAG-LLOYD', ZIMU: 'ZIM', EGLV: 'EVERGREEN',
  }
  return MAP[pfx] ?? pfx
}

const DEMO_LIMIT = 5
const STORAGE_KEY = 'ddz_usage_count'

function getUsageCount() {
  return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10)
}
function incrementUsage() {
  const next = getUsageCount() + 1
  localStorage.setItem(STORAGE_KEY, String(next))
  return next
}

// ── DocumentDropZone component ────────────────────────────────────────────────
export function DocumentDropZone({ onIngest }) {
  const [dragging,  setDragging]  = useState(false)
  const [phase,     setPhase]     = useState('idle')   // idle | reading | analyzing | done | error | locked
  const [fileName,  setFileName]  = useState(null)
  const [logLines,  setLogLines]  = useState([])
  const [result,    setResult]    = useState(null)
  const [open,      setOpen]      = useState(true)
  const [usageCount, setUsageCount] = useState(getUsageCount)
  const inputRef = useRef(null)
  const logRef   = useRef(null)

  const remaining = DEMO_LIMIT - usageCount
  const isLocked  = usageCount >= DEMO_LIMIT

  // Auto-scroll terminal log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logLines])

  const appendLog = useCallback((icon, msg, color = '#A8D5B5') => {
    setLogLines(prev => [...prev, { icon, msg, color }])
  }, [])

  const analyzeText = useCallback(async (text, name) => {
    setPhase('analyzing')
    setLogLines([])
    setResult(null)

    const delay = ms => new Promise(r => setTimeout(r, ms))

    appendLog('ti-file-text',    `Document loaded: ${name}`,                                         '#A8D5B5')
    await delay(320)
    appendLog('ti-scan',         'Scanning for logistics fields…',                                   '#A8D5B5')
    await delay(480)

    const fields = extractLogisticsFields(text)

    appendLog('ti-ship',    `Vessel name        → ${fields.vessel_name       ?? '✗ not found'}`,  fields.vessel_name       ? '#A8D5B5' : '#F87171')
    await delay(220)
    appendLog('ti-box',     `Container ID       → ${fields.container_id      ?? '✗ not found'}`,  fields.container_id      ? '#A8D5B5' : '#F87171')
    await delay(220)
    appendLog('ti-anchor',  `Port of discharge  → ${fields.port_of_discharge ?? '✗ not found'}`,  fields.port_of_discharge ? '#A8D5B5' : '#F87171')
    await delay(220)
    appendLog('ti-clock',   `Free time deadline → ${fields.free_time_deadline ?? '✗ not found'}`, fields.free_time_deadline ? '#A8D5B5' : '#F87171')
    await delay(380)

    const failures   = validateFields(fields)
    const dl         = fields.free_time_deadline
    const days       = daysUntil(dl)
    const urgency    = days === null ? null : days <= 2 ? 'critical' : days <= 4 ? 'urgent' : 'clean'
    const finalStatus = failures.length > 0 ? 'exception' : (urgency ?? 'clean')

    if (failures.length === 0) {
      appendLog('ti-shield-check', 'Validation PASSED — routing to dashboard queue', '#4ADE80')
    } else {
      appendLog('ti-shield-x', `Validation FAILED (${failures.length} issue${failures.length > 1 ? 's' : ''}) — routing to exception queue`, '#F87171')
      failures.forEach((f, i) => {
        appendLog('ti-point-filled', `[${i + 1}] ${f}`, '#F87171')
      })
    }
    await delay(320)
    appendLog('ti-check', 'Record ingested: ' + new Date().toISOString().slice(0, 19) + 'Z', '#00F5FF')

    const record = {
      id:        `MDP-DOC-${Date.now().toString().slice(-8)}`,
      ts:        new Date().toISOString(),
      vessel:    fields.vessel_name ?? null,
      container: fields.container_id ?? null,
      pod:       fields.port_of_discharge ?? null,
      deadline:  dl ?? null,
      status:    finalStatus,
      carrier:   guessCarrier(fields.container_id),
      daysLeft:  days,
      accuracy:  failures.length === 0 ? 100 : Math.round((1 - failures.length / 4) * 100),
      failures:  failures.length > 0 ? failures : [],
      _sourceFile: name,
    }

    const newCount = incrementUsage()
    setUsageCount(newCount)
    setResult(record)
    setPhase('done')
    onIngest(record)
  }, [appendLog, onIngest])

  const processFile = useCallback((file) => {
    if (!file) return
    // Enforce demo limit
    if (getUsageCount() >= DEMO_LIMIT) {
      setPhase('locked')
      setOpen(true)
      return
    }
    const ext = file.name.split('.').pop().toLowerCase()
    const supported = ['txt', 'eml', 'csv', 'log', 'msg', 'pdf']
    if (!supported.includes(ext)) {
      setPhase('error')
      setFileName(file.name)
      setOpen(true)
      setLogLines([{ icon: 'ti-alert-circle', msg: `Unsupported file type: .${ext}. Supported: .pdf, .txt, .eml, .log`, color: '#F87171' }])
      return
    }
    setFileName(file.name)
    setPhase('reading')
    setOpen(true)

    if (ext === 'pdf') {
      // Read as ArrayBuffer for PDF.js
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const text = await extractTextFromPDF(e.target.result)
          analyzeText(text, file.name)
        } catch (err) {
          setPhase('error')
          setLogLines([{ icon: 'ti-alert-circle', msg: `PDF parse error: ${err.message}`, color: '#F87171' }])
        }
      }
      reader.onerror = () => {
        setPhase('error')
        setLogLines([{ icon: 'ti-alert-circle', msg: 'Could not read PDF file.', color: '#F87171' }])
      }
      reader.readAsArrayBuffer(file)
    } else {
      // Plain text read
      const reader = new FileReader()
      reader.onload  = e => analyzeText(e.target.result, file.name)
      reader.onerror = () => {
        setPhase('error')
        setLogLines([{ icon: 'ti-alert-circle', msg: 'Could not read file.', color: '#F87171' }])
      }
      reader.readAsText(file)
    }
  }, [analyzeText])

  const onDrop      = useCallback(e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]) }, [processFile])
  const onDragOver  = e => { e.preventDefault(); setDragging(true) }
  const onDragLeave = ()  => setDragging(false)
  const onFileInput = e  => processFile(e.target.files[0])

  const reset = () => {
    // Only allow reset if not locked
    if (isLocked) return
    setPhase('idle'); setFileName(null); setLogLines([]); setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Dynamic border/bg based on state
  const borderColor = isLocked ? 'var(--outline-dim)'
    : dragging ? '#00F5FF'
    : phase === 'done'  ? (result?.status === 'exception' ? '#A78BFA' : '#4ADE80')
    : phase === 'error' ? '#F87171'
    : 'var(--outline-variant)'

  return (
    <div style={{
      background:    'var(--surface-container-low)',
      border:        `1.5px dashed ${borderColor}`,
      borderRadius:  12,
      overflow:      'hidden',
      transition:    'border-color 0.25s',
    }}>
      {/* ── Collapsible header ── */}
      <button
        id="doc-drop-zone-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--on-surface)', fontSize: 13, fontWeight: 500,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-upload" style={{ fontSize: 16, color: isLocked ? 'var(--on-surface-muted)' : '#00F5FF' }} aria-hidden="true" />
          Document analyzer — drop a carrier arrival notice
          {/* Usage counter pill */}
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
            letterSpacing: '0.05em',
            background: isLocked ? 'rgba(248,113,113,0.1)' : remaining <= 2 ? 'rgba(251,191,36,0.1)' : 'rgba(0,245,255,0.08)',
            color:      isLocked ? '#F87171'               : remaining <= 2 ? '#FBBF24'              : '#00F5FF',
            border: `0.5px solid ${isLocked ? 'rgba(248,113,113,0.3)' : remaining <= 2 ? 'rgba(251,191,36,0.3)' : 'rgba(0,245,255,0.2)'}`,
          }}>
            {isLocked ? '🔒 Limit reached' : `${usageCount}/${DEMO_LIMIT} used`}
          </span>
          {phase === 'done' && result && !isLocked && (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
              letterSpacing: '0.06em',
              background: result.status === 'exception' ? 'rgba(167,139,250,0.15)' : 'rgba(74,222,128,0.12)',
              color:      result.status === 'exception' ? '#A78BFA' : '#4ADE80',
              border: `0.5px solid ${result.status === 'exception' ? '#A78BFA' : '#4ADE80'}`,
            }}>
              {result.status === 'exception' ? '⚠ EXCEPTION' : '✓ ROUTED'}
            </span>
          )}
        </span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {phase === 'done' && !isLocked && (
            <button
              id="doc-drop-zone-clear"
              onClick={e => { e.stopPropagation(); reset() }}
              style={{
                fontSize: 11, padding: '3px 8px', cursor: 'pointer',
                background: 'var(--surface-container)', borderRadius: 6,
                border: '0.5px solid var(--outline-variant)', color: 'var(--on-surface-muted)',
              }}
            >Clear</button>
          )}
          <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 14, color: 'var(--on-surface-muted)' }} aria-hidden="true" />
        </span>
      </button>

      {/* ── Panel body ── */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '0.5px solid var(--outline-dim)' }}>

          {/* ── Locked state ── */}
          {isLocked && (
            <div style={{
              marginTop: 12,
              border: '1.5px dashed rgba(248,113,113,0.3)',
              borderRadius: 10, padding: '28px 20px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'rgba(248,113,113,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ti ti-lock" style={{ fontSize: 26, color: '#F87171' }} aria-hidden="true" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#F87171', margin: 0 }}>
                  Demo limit reached
                </p>
                <p style={{ fontSize: 12, color: 'var(--on-surface-muted)', margin: '6px 0 0', lineHeight: 1.6 }}>
                  You've analyzed {DEMO_LIMIT} documents in this session.<br />
                  Contact us to unlock full access.
                </p>
              </div>
              <a
                href="mailto:ops@pytan.io?subject=Demurrage Shield — Full Access Request"
                style={{
                  fontSize: 12, fontWeight: 600, padding: '8px 20px',
                  background: 'var(--primary)', color: 'var(--on-primary)',
                  borderRadius: 8, textDecoration: 'none', letterSpacing: '0.02em',
                }}
              >
                Request Full Access →
              </a>
            </div>
          )}

          {/* ── Drop zone (idle only) ── */}
          {phase === 'idle' && !isLocked && (
            <div
              id="doc-drop-area"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Drop carrier document or click to browse"
              onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
              style={{
                marginTop: 12,
                border: `1.5px dashed ${dragging ? '#00F5FF' : 'var(--outline-variant)'}`,
                borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'rgba(0,245,255,0.04)' : 'transparent',
                transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: dragging ? 'rgba(0,245,255,0.12)' : 'var(--surface-container)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: dragging ? '0 0 18px rgba(0,245,255,0.2)' : 'none',
              }}>
                <i className="ti ti-file-arrow-up"
                  style={{ fontSize: 26, color: dragging ? '#00F5FF' : 'var(--on-surface-muted)', transition: 'color 0.2s' }}
                  aria-hidden="true" />
              </div>

              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--on-surface)', margin: 0 }}>
                  {dragging ? 'Release to analyze' : 'Drop a carrier document here'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--on-surface-muted)', margin: '5px 0 0' }}>
                  .pdf · .txt · .eml · .log —&nbsp;
                  <span style={{ color: '#00F5FF', textDecoration: 'underline' }}>click to browse</span>
                </p>
              </div>

              {/* Supported field chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 2 }}>
                {['Vessel name', 'Container ID', 'Port of discharge', 'Free time deadline'].map(f => (
                  <span key={f} style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 99,
                    background: 'var(--surface-container)', color: 'var(--on-surface-muted)',
                    border: '0.5px solid var(--outline-dim)',
                  }}>{f}</span>
                ))}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.eml,.log,.msg,.csv"
                onChange={onFileInput}
                style={{ display: 'none' }}
                aria-label="Upload carrier arrival notice document"
              />
            </div>
          )}

          {/* ── Analysis view (reading / analyzing / done / error) ── */}
          {phase !== 'idle' && (
            <div style={{ marginTop: 12 }}>
              {/* File name bar */}
              {fileName && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--on-surface-muted)', marginBottom: 8,
                }}>
                  <i className="ti ti-file" style={{ fontSize: 13 }} aria-hidden="true" />
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--on-surface)', flex: 1 }}>{fileName}</span>
                  {phase === 'done' && (
                    <span
                      onClick={reset}
                      style={{ fontSize: 11, color: '#00F5FF', cursor: 'pointer', userSelect: 'none' }}
                    >← Analyze another</span>
                  )}
                </div>
              )}

              {/* Terminal log */}
              <div
                ref={logRef}
                style={{
                  background: '#0A1010', borderRadius: 8,
                  padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 11.5,
                  minHeight: 120, maxHeight: 200, overflowY: 'auto', marginBottom: 12,
                  border: '0.5px solid var(--outline-dim)',
                }}
              >
                {logLines.length === 0 && (
                  <span style={{ color: '#3A494A' }}>// reading document…</span>
                )}
                {logLines.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', gap: 8, color: l.color, marginBottom: 3,
                      animation: 'fade-up 0.2s ease both',
                    }}
                  >
                    <i className={`ti ${l.icon}`} style={{ fontSize: 12, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                    <span>{l.msg}</span>
                  </div>
                ))}
                {(phase === 'reading' || phase === 'analyzing') && (
                  <div style={{ color: '#00F5FF', marginTop: 4, animation: 'blink-cursor 1s step-end infinite' }}>▋</div>
                )}
              </div>

              {/* ── Result field cards ── */}
              {phase === 'done' && result && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  {[
                    { icon: 'ti-ship',   label: 'Vessel name',        val: result.vessel,    ok: !!result.vessel },
                    { icon: 'ti-box',    label: 'Container ID',        val: result.container, ok: /^[A-Z]{4}\d{6,7}$/.test(result.container ?? ''), mono: true },
                    { icon: 'ti-anchor', label: 'Port of discharge',   val: result.pod,       ok: !!result.pod },
                    { icon: 'ti-clock',  label: 'Free time deadline',  val: result.deadline,  ok: !!result.deadline },
                  ].map((f, i) => (
                    <div
                      key={i}
                      style={{
                        background: f.ok ? 'rgba(74,222,128,0.06)'    : 'rgba(248,113,113,0.06)',
                        border:     `0.5px solid ${f.ok ? 'rgba(74,222,128,0.22)' : 'rgba(248,113,113,0.22)'}`,
                        borderRadius: 8, padding: '10px 12px',
                        animation: 'fade-up 0.3s ease both',
                        animationDelay: `${i * 60}ms`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <i className={`ti ${f.icon}`} style={{ fontSize: 12, color: f.ok ? '#4ADE80' : '#F87171' }} aria-hidden="true" />
                        <span style={{ fontSize: 10, color: 'var(--on-surface-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</span>
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 500,
                        fontFamily: f.mono ? 'var(--font-mono)' : 'inherit',
                        color: f.ok ? 'var(--on-surface)' : '#F87171',
                        fontStyle: !f.val ? 'italic' : 'normal',
                      }}>
                        {f.val ?? 'not found'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Routing verdict banner ── */}
              {phase === 'done' && result && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px',
                  background: result.status === 'exception' ? 'rgba(167,139,250,0.08)' : 'rgba(74,222,128,0.08)',
                  border: `0.5px solid ${result.status === 'exception' ? 'rgba(167,139,250,0.25)' : 'rgba(74,222,128,0.25)'}`,
                  borderRadius: 8, fontSize: 12, fontWeight: 500,
                  color: result.status === 'exception' ? '#A78BFA' : '#4ADE80',
                  animation: 'fade-up 0.35s ease both',
                }}>
                  <i
                    className={`ti ${result.status === 'exception' ? 'ti-alert-triangle' : 'ti-circle-check'}`}
                    style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}
                    aria-hidden="true"
                  />
                  <div>
                    {result.status === 'exception'
                      ? <>Routed to <strong>exception queue</strong> — {result.failures?.length ?? 0} validation issue(s). Assign to compliance officer for manual BOL verification.</>
                      : <>Routed to <strong>dashboard queue</strong> — all fields validated.{result.daysLeft !== null ? ` ${result.daysLeft} days until free time expires.` : ''}</>
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
