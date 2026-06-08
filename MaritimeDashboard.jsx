import { useState, useEffect, useRef } from "react";

// ── Realistic seed data ─────────────────────────────────────────────────────
const SEED_RECORDS = [
  {
    id: "MDP-20260604-9421",
    ts: "2026-06-04T07:14:33Z",
    vessel: "MSC MAYA",
    container: "MSCU1234567",
    pod: "New York (USNYC)",
    deadline: "2026-06-09",
    status: "clean",
    carrier: "MSC",
    daysLeft: 5,
  },
  {
    id: "MDP-20260604-7832",
    ts: "2026-06-04T08:47:12Z",
    vessel: "MAERSK ELBA",
    container: "MAEU9871234",
    pod: "Savannah (USSAV)",
    deadline: "2026-06-07",
    status: "urgent",
    carrier: "MAERSK",
    daysLeft: 3,
  },
  {
    id: "MDP-20260604-6610",
    ts: "2026-06-04T09:23:55Z",
    vessel: "EVER EXCEL",
    container: "BADID999",
    pod: "Baltimore (USBAL)",
    deadline: null,
    status: "exception",
    carrier: "EVERGREEN",
    daysLeft: null,
    failures: ["container_id fails ISO 6346 format", "free_time_deadline not found — CRITICAL"],
  },
  {
    id: "MDP-20260604-5501",
    ts: "2026-06-04T10:01:08Z",
    vessel: "CMA CGM MARCO POLO",
    container: "CMAU4561237",
    pod: "Norfolk (USORF)",
    deadline: "2026-06-11",
    status: "clean",
    carrier: "CMA CGM",
    daysLeft: 7,
  },
  {
    id: "MDP-20260604-4488",
    ts: "2026-06-04T11:44:29Z",
    vessel: "ONE HARMONY",
    container: "ONEU8882341",
    pod: "Charleston (USCHS)",
    deadline: "2026-06-06",
    status: "critical",
    carrier: "ONE",
    daysLeft: 2,
  },
  {
    id: "MDP-20260604-3312",
    ts: "2026-06-04T12:09:17Z",
    vessel: "ZIM VIRGINIA",
    container: null,
    pod: "Philadelphia (USPHL)",
    deadline: null,
    status: "exception",
    carrier: "ZIM",
    daysLeft: null,
    failures: ["container_id: field not found in email body", "free_time_deadline: field not found"],
  },
];

// ── Simulated incoming email bodies ────────────────────────────────────────
const DEMO_EMAILS = [
  {
    from: "noreply@hapag-lloyd.com",
    subject: "Arrival Notice — HL KOBE — USNYC",
    body: `Vessel Name: HL KOBE\nContainer ID: HLCU7341209\nPort of Discharge: New York (USNYC)\nFree Time Deadline: 2026-06-12\nFree days: 5 calendar days`,
    vessel: "HL KOBE",
    container: "HLCU7341209",
    pod: "New York (USNYC)",
    deadline: "2026-06-12",
    carrier: "HAPAG-LLOYD",
    daysLeft: 8,
    status: "clean",
  },
  {
    from: "ops@yang-ming.com",
    subject: "Arrival Notice — YM UNANIMITY — USSAV",
    body: `Vessel Name: YM UNANIMITY\nContainer: YMxx-MISSING\nPort of Discharge: Savannah GA\nNOTE: Free time TBD, contact local office`,
    vessel: "YM UNANIMITY",
    container: "YMxx-MISSING",
    pod: "Savannah (USSAV)",
    deadline: null,
    carrier: "YANG MING",
    daysLeft: null,
    status: "exception",
    failures: ["container_id: 'YMxx-MISSING' fails ISO 6346 format", "free_time_deadline: not found — CRITICAL"],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_META = {
  clean:     { label: "Draft Ready",        bg: "#E6F4EA", text: "#1A6B3C", border: "#A8D5B5" },
  urgent:    { label: "Urgent — 3 Days",    bg: "#FFF3E0", text: "#8C4A00", border: "#FFB84D" },
  critical:  { label: "CRITICAL — 2 Days",  bg: "#FDECEA", text: "#8B1A1A", border: "#F5A5A5" },
  exception: { label: "Human Review",       bg: "#F3F0FF", text: "#4A2D8C", border: "#C4B5F7" },
};

const CARRIER_COLORS = {
  MSC:         "#1A4FA3",
  MAERSK:      "#00243D",
  "CMA CGM":   "#E8192C",
  EVERGREEN:   "#1D6A39",
  ONE:         "#F7941D",
  ZIM:         "#003087",
  "HAPAG-LLOYD":"#F07C00",
  "YANG MING": "#1D3E8A",
};

function daysColor(d) {
  if (d === null) return "#7C3AED";
  if (d <= 2) return "#DC2626";
  if (d <= 4) return "#D97706";
  return "#16A34A";
}

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 18, color: accent }} aria-hidden="true" />
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <span style={{ fontSize: 28, fontWeight: 500, color: accent ?? "var(--color-text-primary)" }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.clean;
  return (
    <span style={{
      fontSize: 11, fontWeight: 500,
      background: m.bg, color: m.text,
      border: `0.5px solid ${m.border}`,
      borderRadius: "var(--border-radius-md)",
      padding: "3px 9px", whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

function PipelineStepper({ record }) {
  const steps = [
    { icon: "ti-mail-opened", label: "Email intercepted", done: true },
    { icon: "ti-scan",        label: "Fields extracted",  done: !!record.vessel },
    { icon: "ti-shield-check",label: "Validation gate",   done: true, failed: record.status === "exception" },
    { icon: "ti-route",       label: "Routed",             done: true, to: record.status === "exception" ? "Exception queue" : "Dashboard queue" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 12 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: s.failed ? "#FDECEA" : "#E6F4EA",
              border: `0.5px solid ${s.failed ? "#F5A5A5" : "#A8D5B5"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 14, color: s.failed ? "#DC2626" : "#16A34A" }} aria-hidden="true" />
            </div>
            <span style={{ fontSize: 10, color: "var(--color-text-secondary)", whiteSpace: "nowrap", maxWidth: 70, textAlign: "center" }}>
              {s.to ?? s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, background: "var(--color-border-tertiary)", margin: "0 4px", marginBottom: 16 }} />
          )}
        </div>
      ))}
    </div>
  );
}

function RecordRow({ record, onClick, selected }) {
  return (
    <div
      onClick={() => onClick(record)}
      style={{
        display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr 1fr 90px",
        alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: selected ? "var(--color-background-secondary)" : "var(--color-background-primary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        cursor: "pointer", transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "var(--color-background-primary)"; }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{record.vessel}</div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>{fmtTime(record.ts)} UTC</div>
      </div>
      <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}>
        {record.container ?? <span style={{ color: "#DC2626" }}>— missing —</span>}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{record.pod ?? "—"}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: daysColor(record.daysLeft) }}>
        {record.daysLeft !== null ? `${record.daysLeft}d left` : <span style={{ color: "#7C3AED" }}>Unknown</span>}
      </div>
      <StatusBadge status={record.status} />
    </div>
  );
}

function DetailPanel({ record, onClose }) {
  if (!record) return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 12, color: "var(--color-text-secondary)", padding: 32,
    }}>
      <i className="ti ti-click" style={{ fontSize: 36, opacity: 0.3 }} aria-hidden="true" />
      <span style={{ fontSize: 14 }}>Select a record to inspect</span>
    </div>
  );

  const carrierColor = CARRIER_COLORS[record.carrier] ?? "#555";
  const isException  = record.status === "exception";

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{
              fontSize: 10, fontWeight: 500, background: carrierColor, color: "#fff",
              borderRadius: "var(--border-radius-md)", padding: "3px 8px", letterSpacing: "0.05em",
            }}>{record.carrier}</span>
            <StatusBadge status={record.status} />
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>{record.vessel}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}>{record.id}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          style={{
            background: "none", border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "var(--border-radius-md)", padding: "4px 10px", cursor: "pointer",
            color: "var(--color-text-secondary)", fontSize: 13,
          }}
        >
          <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
        </button>
      </div>

      {/* Demurrage risk meter */}
      <div style={{
        background: isException ? "#F3F0FF" : record.daysLeft <= 2 ? "#FDECEA" : record.daysLeft <= 4 ? "#FFF8E1" : "#E6F4EA",
        border: `0.5px solid ${isException ? "#C4B5F7" : record.daysLeft <= 2 ? "#F5A5A5" : record.daysLeft <= 4 ? "#FFD54F" : "#A8D5B5"}`,
        borderRadius: "var(--border-radius-lg)", padding: "14px 18px",
      }}>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>DEMURRAGE EXPOSURE</div>
        {isException ? (
          <div style={{ fontSize: 14, fontWeight: 500, color: "#4A2D8C" }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 16, marginRight: 6, verticalAlign: -2 }} aria-hidden="true" />
            Free time unknown — clock may already be running
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 500, color: daysColor(record.daysLeft) }}>{record.daysLeft}d</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>until free time expires</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Deadline: {fmt(record.deadline)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Fields */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)", overflow: "hidden",
      }}>
        {[
          { icon: "ti-ship",       label: "Vessel name",       val: record.vessel },
          { icon: "ti-box",        label: "Container ID",      val: record.container,  mono: true,  missing: !record.container },
          { icon: "ti-anchor",     label: "Port of discharge", val: record.pod },
          { icon: "ti-clock",      label: "Free time deadline",val: fmt(record.deadline), missing: !record.deadline },
          { icon: "ti-calendar",   label: "Intercepted",       val: `${fmt(record.ts)} · ${fmtTime(record.ts)} UTC` },
        ].map((row, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "30px 140px 1fr",
            alignItems: "center", gap: 8, padding: "11px 16px",
            borderTop: i > 0 ? "0.5px solid var(--color-border-tertiary)" : "none",
          }}>
            <i className={`ti ${row.icon}`} style={{ fontSize: 15, color: "var(--color-text-secondary)" }} aria-hidden="true" />
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{row.label}</span>
            <span style={{
              fontSize: 13, fontWeight: 500,
              fontFamily: row.mono ? "var(--font-mono)" : "inherit",
              color: row.missing ? "#DC2626" : "var(--color-text-primary)",
            }}>
              {row.val ?? <span style={{ fontStyle: "italic", fontWeight: 400 }}>not found</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Exception failures */}
      {isException && record.failures && (
        <div style={{
          background: "#FDECEA", border: "0.5px solid #F5A5A5",
          borderRadius: "var(--border-radius-lg)", padding: "14px 18px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#8B1A1A", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 15 }} aria-hidden="true" />
            Validation failures
          </div>
          {record.failures.map((f, i) => (
            <div key={i} style={{
              fontSize: 12, color: "#8B1A1A", padding: "6px 10px",
              background: "rgba(255,255,255,0.5)", borderRadius: "var(--border-radius-md)", marginBottom: 4,
              fontFamily: "var(--font-mono)",
            }}>[{i + 1}] {f}</div>
          ))}
          <div style={{ fontSize: 12, color: "#8B1A1A", marginTop: 10, fontWeight: 500 }}>
            → Assign to compliance officer. Verify BOL manually.
          </div>
        </div>
      )}

      {/* Pipeline flow */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)", padding: "14px 18px",
      }}>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>PIPELINE TRACE</div>
        <PipelineStepper record={record} />
      </div>

      {/* JSON payload */}
      <details style={{ marginTop: 0 }}>
        <summary style={{ fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", userSelect: "none" }}>
          View raw JSON payload
        </summary>
        <pre style={{
          fontSize: 11, fontFamily: "var(--font-mono)",
          color: "var(--color-text-secondary)",
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md)",
          padding: 12, marginTop: 8, overflowX: "auto",
          whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}>
          {JSON.stringify({
            pipeline_run_id: record.id,
            ingestion_timestamp: record.ts,
            extracted_fields: {
              vessel_name: record.vessel,
              container_id: record.container,
              port_of_discharge: record.pod,
              free_time_deadline: record.deadline,
            },
            validation_failures: record.failures ?? [],
            status: STATUS_META[record.status]?.label,
            routing: record.status === "exception" ? "EXCEPTION_QUEUE" : "DASHBOARD_QUEUE",
            human_action_required: record.status === "exception",
          }, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function EmailSimulator({ onIngest }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);

  const simulate = async () => {
    const email = DEMO_EMAILS[idx % DEMO_EMAILS.length];
    setRunning(true);
    setLog([]);
    const steps = [
      { icon: "ti-wifi", msg: `Connecting to imap.gmail.com:993…`, ms: 400 },
      { icon: "ti-lock", msg: `Authenticated. Inbox selected.`, ms: 500 },
      { icon: "ti-mail-opened", msg: `Found unread: "${email.subject}"`, ms: 600 },
      { icon: "ti-scan", msg: `Extracting logistics fields…`, ms: 700 },
      { icon: "ti-shield-check", msg: email.status === "exception" ? `Validation FAILED — routing to exception queue` : `Validation passed — routing to dashboard`, ms: 800 },
      { icon: "ti-check", msg: `Record ingested: ${new Date().toISOString().slice(0,19)}Z`, ms: 400 },
    ];
    for (const step of steps) {
      await new Promise(r => setTimeout(r, step.ms));
      setLog(prev => [...prev, step]);
    }
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
      failures: email.failures,
    };
    onIngest(newRecord);
    setIdx(i => i + 1);
    setRunning(false);
  };

  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
          color: "var(--color-text-primary)", fontSize: 13, fontWeight: 500,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-terminal" style={{ fontSize: 16 }} aria-hidden="true" />
          Live demo — simulate incoming email
        </span>
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 14 }} aria-hidden="true" />
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{
            background: "#0D1117", borderRadius: "var(--border-radius-md)",
            padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 12,
            minHeight: 100, marginTop: 12, marginBottom: 12,
          }}>
            {log.length === 0 && (
              <span style={{ color: "#555" }}>// waiting for pipeline run…</span>
            )}
            {log.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 8, color: "#A8D5B5", marginBottom: 3 }}>
                <i className={`ti ${l.icon}`} style={{ fontSize: 13, color: "#5DCAA5", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                <span>{l.msg}</span>
              </div>
            ))}
            {running && (
              <div style={{ color: "#EF9F27", marginTop: 4 }}>
                <span style={{ animation: "none" }}>▋</span>
              </div>
            )}
          </div>
          <button
            onClick={simulate}
            disabled={running}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px",
              background: running ? "var(--color-background-secondary)" : "var(--color-text-primary)",
              color: running ? "var(--color-text-secondary)" : "var(--color-background-primary)",
              border: "none", borderRadius: "var(--border-radius-md)",
              fontSize: 13, fontWeight: 500, cursor: running ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            <i className={`ti ${running ? "ti-loader" : "ti-player-play"}`} style={{ fontSize: 14 }} aria-hidden="true" />
            {running ? "Running…" : "Simulate arrival notice →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function App() {
  const [records, setRecords]       = useState(SEED_RECORDS);
  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [lastPing, setLastPing]     = useState(null);

  const totalExceptions  = records.filter(r => r.status === "exception").length;
  const totalCritical    = records.filter(r => r.status === "critical").length;
  const totalClean       = records.filter(r => r.status === "clean").length;
  const avgDays          = Math.round(
    records.filter(r => r.daysLeft !== null).reduce((s, r) => s + r.daysLeft, 0) /
    (records.filter(r => r.daysLeft !== null).length || 1)
  );

  const filtered = records.filter(r => {
    const matchFilter = filter === "all" || r.status === filter;
    const term = search.toLowerCase();
    const matchSearch = !term ||
      r.vessel.toLowerCase().includes(term) ||
      (r.container ?? "").toLowerCase().includes(term) ||
      (r.pod ?? "").toLowerCase().includes(term) ||
      r.id.toLowerCase().includes(term);
    return matchFilter && matchSearch;
  });

  const handleIngest = (rec) => {
    setRecords(prev => [rec, ...prev]);
    setSelected(rec);
    setLastPing(rec.ts);
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-primary)", padding: "20px 0" }}>
      <h2 className="sr-only">Maritime Demurrage Shield — Operations Dashboard</h2>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-anchor" style={{ fontSize: 22, color: "var(--color-text-primary)" }} aria-hidden="true" />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Demurrage Shield</h1>
            <span style={{
              fontSize: 10, fontWeight: 500, padding: "2px 7px",
              background: "var(--color-background-success)", color: "var(--color-text-success)",
              border: "0.5px solid var(--color-border-success)",
              borderRadius: "var(--border-radius-md)", letterSpacing: "0.04em",
            }}>LIVE</span>
          </div>
          <p style={{ margin: "4px 0 0 32px", fontSize: 12, color: "var(--color-text-secondary)" }}>
            US East Coast freight operations · Email-driven intake pipeline
          </p>
        </div>
        {lastPing && (
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textAlign: "right" }}>
            Last ingestion<br />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)" }}>
              {new Date(lastPing).toLocaleTimeString()} today
            </span>
          </div>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatCard icon="ti-file-invoice"   label="Total records"  value={records.length}   accent="var(--color-text-primary)" />
        <StatCard icon="ti-circle-check"   label="Draft ready"    value={totalClean}        accent="#16A34A" />
        <StatCard icon="ti-alert-triangle" label="Exceptions"     value={totalExceptions}   accent="#7C3AED" />
        <StatCard icon="ti-flame"          label="Critical (≤2d)" value={totalCritical}     accent="#DC2626" />
        <StatCard icon="ti-clock"          label="Avg free days"  value={`${avgDays}d`}     accent="#D97706" />
      </div>

      {/* ── Email simulator ── */}
      <div style={{ marginBottom: 16 }}>
        <EmailSimulator onIngest={handleIngest} />
      </div>

      {/* ── Table + detail layout ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 340px", gap: 12,
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        overflow: "hidden", minHeight: 420,
      }}>
        {/* Table side */}
        <div style={{ display: "flex", flexDirection: "column", borderRight: "0.5px solid var(--color-border-tertiary)" }}>
          {/* Table controls */}
          <div style={{
            padding: "12px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)",
            display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
          }}>
            <div style={{ position: "relative", flex: 1, minWidth: 140 }}>
              <i className="ti ti-search" style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                fontSize: 14, color: "var(--color-text-secondary)", pointerEvents: "none",
              }} aria-hidden="true" />
              <input
                type="text" placeholder="Search vessel, container, POD…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: 32, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <select
              value={filter} onChange={e => setFilter(e.target.value)}
              style={{ fontSize: 13, padding: "6px 10px", borderRadius: "var(--border-radius-md)" }}
            >
              <option value="all">All statuses</option>
              <option value="clean">Draft ready</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
              <option value="exception">Exception</option>
            </select>
          </div>

          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr 1fr 90px",
            gap: 12, padding: "8px 16px",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-secondary)",
          }}>
            {["Vessel / time", "Container ID", "Port (POD)", "Free time", "Status"].map(h => (
              <span key={h} style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                No records match your filter.
              </div>
            ) : (
              filtered.map(r => (
                <RecordRow
                  key={r.id} record={r}
                  onClick={setSelected}
                  selected={selected?.id === r.id}
                />
              ))
            )}
          </div>

          <div style={{
            padding: "8px 16px", borderTop: "0.5px solid var(--color-border-tertiary)",
            fontSize: 11, color: "var(--color-text-secondary)",
          }}>
            Showing {filtered.length} of {records.length} records
          </div>
        </div>

        {/* Detail side */}
        <DetailPanel
          record={selected}
          onClose={() => setSelected(null)}
        />
      </div>

      {/* ── Bottom note ── */}
      <p style={{ marginTop: 16, fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center" }}>
        Records in exception queue require human compliance review before submission to port authority systems.
        Average USEC demurrage: $175–$500 / container / day after free time.
      </p>
    </div>
  );
}
