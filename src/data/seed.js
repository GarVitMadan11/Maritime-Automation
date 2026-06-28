// ── Seed Records ────────────────────────────────────────────────────────────
export const SEED_RECORDS = [];

// ── Demo Emails for Pipeline Simulation ─────────────────────────────────────
export const DEMO_EMAILS = [];

// ── Carrier Brand Colors ─────────────────────────────────────────────────────
export const CARRIER_COLORS = {
  MSC:           "#1A4FA3",
  MAERSK:        "#00243D",
  "CMA CGM":     "#E8192C",
  EVERGREEN:     "#1D6A39",
  ONE:           "#F7941D",
  ZIM:           "#003087",
  "HAPAG-LLOYD": "#F07C00",
  "YANG MING":   "#1D3E8A",
};

// ── Pipeline Simulation Steps ────────────────────────────────────────────────
export const buildPipelineSteps = (email) => {
  if (!email) return [];
  return [
    { icon: "ti-wifi",         color: "#00dce5", msg: `Connecting to freight mailbox (imap.gmail.com)…`,           ms: 350 },
    { icon: "ti-lock",         color: "#00dce5", msg: `Monitoring INBOX for carrier arrival notices — ${email.from}`, ms: 450 },
    { icon: "ti-mail-opened",  color: "#b9caca", msg: `New notice detected: "${email.subject}"`,                   ms: 550 },
    { icon: "ti-scan",         color: "#b9caca", msg: `Parsing: Vessel, Container Number, POD, Last Free Day…`,    ms: 600 },
    { icon: "ti-shield-check", color: email.status === "exception" ? "#f87171" : "#4ade80",
      msg: email.status === "exception"
        ? `Audit failed: Discrepancy detected → routing to EXCEPTION DESK`
        : `Audit passed: Core LFD data points confirmed → auto-approved`,                                         ms: 700 },
    { icon: "ti-circle-check", color: "#4ade80", msg: `LFD entry active: ${new Date().toISOString().slice(0,19)}Z`, ms: 300 },
  ];
};
