"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║          MARITIME DATA INTAKE & PORT DEMURRAGE SHIELD — v1.0                   ║
║          Live Email-Driven Logistics Intelligence Pipeline                      ║
║                                                                                  ║
║  Architecture: Inbox Intercept → Structured Extraction → Validation Gate →      ║
║                Human-in-the-Loop Triage → Dashboard Queue Routing               ║
║                                                                                  ║
║  Business Context:                                                               ║
║    Port demurrage penalties on the US East Coast (USEC) range from              ║
║    $150–$500/day per container after free time expires. For a single             ║
║    100-container booking, a 5-day delay = $25,000–$75,000 in avoidable          ║
║    storage charges. This pipeline intercepts carrier Arrival Notices,            ║
║    extracts deadline-critical fields, and routes exceptions to human             ║
║    compliance officers before the clock starts running.                          ║
╚══════════════════════════════════════════════════════════════════════════════════╝

SECURITY NOTE:
  - Never hardcode credentials. Use environment variables or a secrets manager.
  - APP_PASSWORD must be a Gmail App Password (not your Google account password).
    Generate at: https://myaccount.google.com/apppasswords
  - For production: replace APP_PASSWORD with AWS Secrets Manager / HashiCorp Vault.
"""

import imaplib
import email as email_lib
import re
import json
import logging
import os
import sys
from datetime import datetime
from email.header import decode_header
from email.message import Message as EmailMessage
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: CONFIGURATION & CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

# --- Credential Placeholders ---
# In production, load these from environment variables or a secrets vault.
# Example: export MARITIME_EMAIL="ops@yourfreightfirm.com"
EMAIL_ACCOUNT  = os.environ.get("MARITIME_EMAIL",    "YOUR_OPS_EMAIL@gmail.com")
APP_PASSWORD   = os.environ.get("MARITIME_APP_PASS", "YOUR_GMAIL_APP_PASSWORD")

# --- IMAP Server Config ---
IMAP_HOST      = "imap.gmail.com"
IMAP_PORT      = 993                        # SSL/TLS port — never use 143 (plaintext)
SEARCH_SUBJECT = "Arrival Notice"           # Subject keyword to filter carrier emails

# --- Pipeline Routing Paths ---
EXCEPTION_LOG_PATH  = "exception_queue.jsonl"   # Flagged records awaiting human review
DASHBOARD_QUEUE_PATH = "dashboard_queue.jsonl"  # Clean records pushed to ops dashboard

# --- Validation Rules ---
# Standard ISO 9897 container ID format: 4 alpha owner-code + 6 digits + 1 check digit
# The 4-letter prefix identifies the shipping line (MSCU=MSC, MAEU=Maersk, CMAU=CMA, etc.)
CONTAINER_ID_PATTERN = re.compile(r"^[A-Z]{4}\d{6,7}$")

# --- Logging Setup ---
# Dual output: structured JSON to file, human-readable to terminal
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler("maritime_pipeline.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger("maritime.pipeline")


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: LIVE IMAP EMAIL CONNECTION LAYER
#
# Reliability design: We use a context-aware connection pattern and explicit
# UID-based operations to prevent duplicate processing across pipeline restarts.
# Marking emails as \Seen immediately after fetch prevents re-ingestion.
# ─────────────────────────────────────────────────────────────────────────────

def connect_and_fetch_arrival_notice(
    host: str = IMAP_HOST,
    port: int = IMAP_PORT,
    account: str = EMAIL_ACCOUNT,
    password: str = APP_PASSWORD,
    subject_keyword: str = SEARCH_SUBJECT
) -> Optional[tuple[str, str]]:
    """
    Establishes a secure IMAP/SSL connection and fetches the most recent
    unread email matching the subject keyword.

    Returns:
        Tuple of (email_uid, raw_body_text) if a matching email is found.
        None if no matching unread emails exist or connection fails.

    Operational note:
        Uses IMAP UID commands (UID SEARCH, UID FETCH, UID STORE) instead of
        sequence numbers. UIDs are stable across sessions; sequence numbers
        can shift when other emails are deleted, causing wrong-email fetches
        in a busy shared inbox — a silent data integrity failure.
    """
    connection = None
    try:
        _print_step("IMAP CONNECT", f"Initiating SSL handshake → {host}:{port}")
        connection = imaplib.IMAP4_SSL(host, port)

        # Authenticate — App Password bypasses 2FA without exposing master credentials
        connection.login(account, password)
        _print_step("AUTH", f"Authenticated as: {account}")

        # Select INBOX in read-write mode (required to mark emails as read)
        status, mailbox_data = connection.select("INBOX")
        if status != "OK":
            log.error(f"Failed to select INBOX. Server response: {mailbox_data}")
            return None

        total_messages = mailbox_data[0].decode() if mailbox_data[0] else "unknown"
        _print_step("MAILBOX", f"INBOX selected | Total messages in mailbox: {total_messages}")

        # Search for UNSEEN emails with matching subject
        # IMAP search criteria: (UNSEEN SUBJECT "Arrival Notice")
        search_criteria = f'(UNSEEN SUBJECT "{subject_keyword}")'
        status, uid_data = connection.uid("SEARCH", None, search_criteria)

        if status != "OK" or not uid_data or uid_data == [b""]:
            _print_step("SEARCH", f"No unread '{subject_keyword}' emails found in INBOX.", level="WARN")
            return None

        # uid_data[0] is a space-separated byte string of matching UIDs
        uid_list = uid_data[0].split()
        _print_step("SEARCH", f"Found {len(uid_list)} unread '{subject_keyword}' email(s). "
                               f"Targeting most recent (UID: {uid_list[-1].decode()}).")

        # Target the most recent matching email (last in the list = highest UID)
        target_uid = uid_list[-1]

        # Fetch full RFC 822 message by UID
        status, message_data = connection.uid("FETCH", target_uid, "(RFC822)")
        if status != "OK" or not message_data:
            log.error(f"FETCH failed for UID {target_uid.decode()}. Status: {status}")
            return None

        # Mark the fetched email as \Seen to prevent re-ingestion on next run
        # This is the idempotency lock — critical for pipelines that run on a schedule
        connection.uid("STORE", target_uid, "+FLAGS", "\\Seen")
        _print_step("LOCK", f"Email UID {target_uid.decode()} marked as \\Seen (idempotency lock set).")

        # Parse the raw RFC 822 bytes into a Python email.message.Message object
        raw_email_bytes = message_data[0][1]
        parsed_email = email_lib.message_from_bytes(raw_email_bytes)

        # Decode the Subject header for display
        subject_raw = parsed_email.get("Subject", "No Subject")
        subject_decoded, encoding = decode_header(subject_raw)[0]
        if isinstance(subject_decoded, bytes):
            subject_decoded = subject_decoded.decode(encoding or "utf-8", errors="replace")

        sender    = parsed_email.get("From", "Unknown Sender")
        recv_date = parsed_email.get("Date", "Unknown Date")

        _print_step("INTERCEPT",
                    f"Email intercepted!\n"
                    f"          │  From    : {sender}\n"
                    f"          │  Subject : {subject_decoded}\n"
                    f"          │  Received: {recv_date}")

        # Extract the plain-text body from potentially multipart MIME structure
        body_text = _extract_plain_text_body(parsed_email)

        if not body_text.strip():
            _print_step("BODY", "Email body is empty or unreadable.", level="WARN")
            return None

        return target_uid.decode(), body_text

    except imaplib.IMAP4.error as e:
        # Covers auth failures, SSL errors, and server-side IMAP errors
        log.error(f"IMAP protocol error: {e}")
        log.error("Common causes: wrong App Password, IMAP not enabled in Gmail settings, "
                  "or 'Less secure app access' blocked (use App Passwords instead).")
        return None
    except ConnectionRefusedError:
        log.error(f"Connection refused at {host}:{port}. Check firewall rules and server availability.")
        return None
    except Exception as e:
        log.error(f"Unexpected error in email fetch layer: {e}", exc_info=True)
        return None
    finally:
        # Always close cleanly to release server-side resources
        if connection:
            try:
                connection.close()
                connection.logout()
                _print_step("DISCONNECT", "IMAP session closed cleanly.")
            except Exception:
                pass  # Suppress logout errors on already-broken connections


def _extract_plain_text_body(parsed_email: EmailMessage) -> str:
    """
    Walks the MIME tree and extracts the first text/plain payload.
    Handles multipart emails (e.g., text/plain + text/html alternatives)
    as well as simple single-part emails.
    """
    if parsed_email.is_multipart():
        for part in parsed_email.walk():
            content_type = part.get_content_type()
            content_disp  = str(part.get("Content-Disposition", ""))

            # Skip attachments; we only want inline text
            if content_type == "text/plain" and "attachment" not in content_disp:
                charset = part.get_content_charset() or "utf-8"
                try:
                    return part.get_payload(decode=True).decode(charset, errors="replace")
                except (AttributeError, UnicodeDecodeError):
                    return ""
    else:
        # Single-part email
        charset = parsed_email.get_content_charset() or "utf-8"
        try:
            return parsed_email.get_payload(decode=True).decode(charset, errors="replace")
        except (AttributeError, UnicodeDecodeError):
            return ""
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: LOGICAL EXTRACTION LAYER
#
# Design principle: Extraction is intentionally regex-based rather than LLM-based
# for this pipeline stage. Carrier formats (Maersk, MSC, CMA) are messy but
# follow quasi-consistent patterns. Regex gives deterministic, auditable
# extraction with zero API latency and zero cost per invocation.
# LLM extraction can be layered on top as a fallback in v2.
# ─────────────────────────────────────────────────────────────────────────────

# Extraction patterns for the four critical demurrage-relevant fields.
# Each pattern is written to handle common carrier formatting variations.
EXTRACTION_PATTERNS = {
    "vessel_name": [
        # Matches: "Vessel: MSC MAYA", "Vessel Name: MAERSK ELBA", "V/V: EVER GIVEN"
        re.compile(r"(?:Vessel(?:\s*Name)?|V/V)\s*[:\-]\s*([A-Z0-9 \-]+?)(?:\n|,|;|\(|$)", re.IGNORECASE),
    ],
    "container_id": [
        # Matches standard ISO container IDs: MSCU1234567, MAEU 987654 3, etc.
        # Allows optional space between owner code and serial number
        re.compile(r"\b([A-Z]{4}\s?\d{6,7})\b"),
    ],
    "port_of_discharge": [
        # Matches: "Port of Discharge: NEW YORK", "POD: SAVANNAH", "Discharge Port: Baltimore"
        re.compile(r"(?:Port\s*of\s*Discharge|POD|Discharge\s*Port)\s*[:\-]\s*([A-Z][A-Za-z\s,]+?)(?:\n|;|$)", re.IGNORECASE),
    ],
    "free_time_deadline": [
        # Matches various date formats carriers use:
        # "Free Time Expires: 2025-08-15", "Free Time Deadline: Aug 15, 2025", "Free Days Until: 15/08/2025"
        re.compile(r"(?:Free\s*Time\s*(?:Expires?|Deadline|Expiry|Allowed\s*Until)|Free\s*Days\s*Until)\s*[:\-]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})", re.IGNORECASE),
    ],
}


def extract_logistics_fields(raw_email_body: str) -> dict:
    """
    Parses a raw carrier email body and extracts the four critical fields
    into a structured dictionary.

    Strategy: Multi-pattern matching with first-match-wins logic.
    Each field can have multiple regex patterns in priority order, allowing
    the extractor to handle different carrier formats (Maersk vs MSC vs CMA CGM).

    Returns a dict with extracted values or None for each missing field.
    A None value triggers the validation gate downstream.
    """
    extracted = {}

    for field, patterns in EXTRACTION_PATTERNS.items():
        value = None
        for pattern in patterns:
            match = pattern.search(raw_email_body)
            if match:
                # Strip whitespace and normalize spacing within the value
                raw_value = match.group(1).strip()
                # Remove container ID internal spaces: "MSCU 123456 7" → "MSCU1234567"
                if field == "container_id":
                    raw_value = raw_value.replace(" ", "")
                value = raw_value
                break  # First matching pattern wins for this field

        extracted[field] = value
        status = f"✓ '{value}'" if value else "✗ NOT FOUND"
        _print_step("EXTRACT", f"{field:<22} → {status}")

    return extracted


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: DATA VALIDATION & HUMAN-IN-THE-LOOP SAFETY GATE
#
# This is the compliance-critical layer. Its job is not to crash the pipeline
# on bad data — it's to safely quarantine bad records while letting clean
# records flow through unimpeded.
#
# Validation rules are derived from ISO 6346 (shipping container identification)
# and operational requirements of USEC freight forwarders.
# ─────────────────────────────────────────────────────────────────────────────

def validate_and_triage_record(extracted_data: dict, email_uid: str) -> dict:
    """
    Applies validation rules to the extracted data record.
    Augments the dict with pipeline metadata and routes it to the
    appropriate output queue based on validation outcome.

    Validation rules (in priority order):
      1. container_id must match ISO 6346 format (4 alpha + 6-7 digits)
      2. free_time_deadline must be present (missing = immediate demurrage risk)

    Any single failure → route to exception queue for human review.
    All rules pass → route to dashboard queue as a draft-ready record.
    """
    validation_failures = []
    pipeline_ts = datetime.utcnow().isoformat() + "Z"

    # --- Rule 1: Container ID Format Validation ---
    container_id = extracted_data.get("container_id")  # Safe retrieval — never KeyError
    if not container_id:
        validation_failures.append("container_id: field not found in email body")
    elif not CONTAINER_ID_PATTERN.match(container_id):
        validation_failures.append(
            f"container_id: '{container_id}' fails ISO 6346 format check "
            f"(expected 4 alpha prefix + 6-7 digits, e.g. MSCU1234567)"
        )

    # --- Rule 2: Free Time Deadline Presence Check ---
    # A missing deadline is the highest-risk failure mode. If we don't know
    # when free time expires, we cannot alert the operations team in time.
    free_time = extracted_data.get("free_time_deadline")  # Safe retrieval
    if not free_time:
        validation_failures.append(
            "free_time_deadline: field not found — CRITICAL: cannot calculate "
            "demurrage exposure without this deadline"
        )

    # --- Build the enriched pipeline record ---
    pipeline_record = {
        "pipeline_run_id"    : f"MDP-{pipeline_ts[:10].replace('-', '')}-{email_uid[-4:]}",
        "ingestion_timestamp": pipeline_ts,
        "source_email_uid"   : email_uid,
        "extracted_fields"   : extracted_data,
        "validation_failures": validation_failures,
    }

    # --- Route based on validation outcome ---
    if validation_failures:
        pipeline_record["status"] = "Pending Human Review"
        pipeline_record["routing"] = "EXCEPTION_QUEUE"
        pipeline_record["human_action_required"] = True
        pipeline_record["demurrage_risk_alert"] = (
            "⚠️  FREE TIME DEADLINE UNKNOWN — Immediate compliance review required. "
            "Port storage charges may begin accruing without operator awareness."
            if not free_time else
            "⚠️  DATA INTEGRITY ISSUE — Validate container ID before submitting "
            "to customs or port authority systems."
        )
        _route_to_exception_queue(pipeline_record)
    else:
        pipeline_record["status"] = "Fields Pre-filled (Draft Ready)"
        pipeline_record["routing"] = "DASHBOARD_QUEUE"
        pipeline_record["human_action_required"] = False
        pipeline_record["demurrage_risk_alert"] = None
        _route_to_dashboard_queue(pipeline_record)

    return pipeline_record


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: TARGET DATA ROUTING LAYER
#
# Both routing functions write to JSONL (newline-delimited JSON) files.
# JSONL is the industry standard for append-only operational logs because:
#   - Each line is a valid, independent JSON object (atomic writes)
#   - Trivially ingestible by Elasticsearch, BigQuery, Splunk, or any ETL tool
#   - Append operations are safe under concurrent writers (unlike JSON arrays)
#
# In production, replace file writes with:
#   - Dashboard queue  → POST to internal REST API / Redis queue / Kafka topic
#   - Exception queue  → POST to Slack webhook + create Jira/Linear ticket
# ─────────────────────────────────────────────────────────────────────────────

def _route_to_dashboard_queue(record: dict) -> None:
    """
    Routes a validated, clean record to the operational dashboard queue.
    Simulates a real-time push to a freight management system or TMS dashboard.
    """
    try:
        with open(DASHBOARD_QUEUE_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, default=str) + "\n")

        _print_step("ROUTE → DASHBOARD",
                    f"Record {record['pipeline_run_id']} written to dashboard queue.\n"
                    f"          │  File: {DASHBOARD_QUEUE_PATH}\n"
                    f"          │  Status: {record['status']}")
    except IOError as e:
        log.error(f"Failed to write to dashboard queue: {e}")
        raise


def _route_to_exception_queue(record: dict) -> None:
    """
    Routes a flagged record to the human review exception queue.
    In production, this would also trigger an immediate Slack/PagerDuty alert
    to the compliance officer on duty.
    """
    try:
        with open(EXCEPTION_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, default=str) + "\n")

        _print_step("ROUTE → EXCEPTION",
                    f"Record {record['pipeline_run_id']} flagged and quarantined.\n"
                    f"          │  File: {EXCEPTION_LOG_PATH}\n"
                    f"          │  Failures: {len(record['validation_failures'])}")
    except IOError as e:
        log.error(f"Failed to write to exception queue: {e}")
        raise


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: CINEMATIC TERMINAL OUTPUT UTILITIES
# ─────────────────────────────────────────────────────────────────────────────

# ANSI color codes for terminal output (degrade gracefully on non-TTY outputs)
class Colors:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    CYAN    = "\033[96m"
    GREEN   = "\033[92m"
    YELLOW  = "\033[93m"
    RED     = "\033[91m"
    WHITE   = "\033[97m"
    DIM     = "\033[2m"
    BLUE    = "\033[94m"
    MAGENTA = "\033[95m"

    @classmethod
    def strip_if_no_tty(cls, text: str) -> str:
        """Remove ANSI codes when output is piped (e.g., to a log file)."""
        if not sys.stdout.isatty():
            return re.sub(r"\033\[[0-9;]*m", "", text)
        return text

def _print_step(stage: str, message: str, level: str = "INFO") -> None:
    """Prints a consistently formatted pipeline stage event to the terminal."""
    color_map = {
        "INFO" : Colors.CYAN,
        "WARN" : Colors.YELLOW,
        "ERROR": Colors.RED,
        "OK"   : Colors.GREEN,
    }
    color   = color_map.get(level, Colors.WHITE)
    ts      = datetime.utcnow().strftime("%H:%M:%S.%f")[:-3]
    stage_w = f"{stage:<20}"
    line    = (f"{Colors.DIM}[{ts} UTC]{Colors.RESET} "
               f"{color}{Colors.BOLD}│ {stage_w}{Colors.RESET} "
               f"{Colors.WHITE}{message}{Colors.RESET}")
    print(Colors.strip_if_no_tty(line))


def print_pipeline_banner() -> None:
    banner = f"""
{Colors.CYAN}{Colors.BOLD}
╔══════════════════════════════════════════════════════════════════════════════╗
║  ⚓  MARITIME DEMURRAGE SHIELD — PIPELINE ACTIVATED                          ║
║     Live Email-to-Dashboard Intake System | USEC Freight Operations         ║
╚══════════════════════════════════════════════════════════════════════════════╝
{Colors.RESET}"""
    print(Colors.strip_if_no_tty(banner))


def print_final_summary(record: dict) -> None:
    """
    Prints the comprehensive pipeline execution report — the "money slide"
    for a client demo. Shows exactly what was intercepted, extracted,
    validated, and where it was routed.
    """
    fields       = record.get("extracted_fields", {})
    failures     = record.get("validation_failures", [])
    status       = record.get("status", "Unknown")
    routing      = record.get("routing", "Unknown")
    run_id       = record.get("pipeline_run_id", "N/A")
    risk_alert   = record.get("demurrage_risk_alert")
    human_needed = record.get("human_action_required", False)

    status_color   = Colors.GREEN if routing == "DASHBOARD_QUEUE" else Colors.YELLOW
    routing_symbol = "✅" if routing == "DASHBOARD_QUEUE" else "⚠️ "

    summary = f"""
{Colors.BLUE}{Colors.BOLD}
┌──────────────────────────────────────────────────────────────────────────────┐
│  PIPELINE EXECUTION SUMMARY — {run_id:<44}│
├──────────────────────────────────────────────────────────────────────────────┤{Colors.RESET}

  {Colors.BOLD}EXTRACTED LOGISTICS FIELDS{Colors.RESET}
  ─────────────────────────────────────────────────────
  {'Vessel Name':<25}  {Colors.GREEN}{fields.get('vessel_name') or '— not found —'}{Colors.RESET}
  {'Container ID':<25}  {Colors.GREEN}{fields.get('container_id') or '— not found —'}{Colors.RESET}
  {'Port of Discharge':<25}  {Colors.GREEN}{fields.get('port_of_discharge') or '— not found —'}{Colors.RESET}
  {'Free Time Deadline':<25}  {Colors.GREEN if fields.get('free_time_deadline') else Colors.RED}{fields.get('free_time_deadline') or '— MISSING — DEMURRAGE RISK'}{Colors.RESET}

  {Colors.BOLD}VALIDATION OUTCOME{Colors.RESET}
  ─────────────────────────────────────────────────────
  Status   :  {status_color}{Colors.BOLD}{routing_symbol}  {status}{Colors.RESET}
  Routing  :  {status_color}{routing}{Colors.RESET}
  Failures :  {Colors.RED if failures else Colors.GREEN}{len(failures)} issue(s) detected{Colors.RESET}"""

    if failures:
        summary += f"\n\n  {Colors.BOLD}VALIDATION FAILURE DETAILS{Colors.RESET}"
        summary += "\n  ─────────────────────────────────────────────────────"
        for i, failure in enumerate(failures, 1):
            summary += f"\n  {Colors.RED}[{i}] {failure}{Colors.RESET}"

    if risk_alert:
        summary += f"""

  {Colors.YELLOW}{Colors.BOLD}COMPLIANCE ALERT{Colors.RESET}
  ─────────────────────────────────────────────────────
  {Colors.YELLOW}{risk_alert}{Colors.RESET}
  {Colors.YELLOW}ACTION: Assign to compliance officer immediately.{Colors.RESET}
  {Colors.YELLOW}         Check BOL and carrier system manually.{Colors.RESET}"""

    summary += f"""

  {Colors.BOLD}HUMAN INTERVENTION REQUIRED{Colors.RESET}  :  {Colors.RED + 'YES — IMMEDIATE ACTION NEEDED' if human_needed else Colors.GREEN + 'NO — AUTO-ROUTING COMPLETE'}{Colors.RESET}
  {Colors.BOLD}Output File{Colors.RESET}                  :  {EXCEPTION_LOG_PATH if routing == 'EXCEPTION_QUEUE' else DASHBOARD_QUEUE_PATH}

{Colors.BLUE}{Colors.BOLD}└──────────────────────────────────────────────────────────────────────────────┘{Colors.RESET}
"""
    print(Colors.strip_if_no_tty(summary))


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: DEMO / OFFLINE MODE
#
# Provides a realistic simulated email body for testing without live credentials.
# This is the "safe demo mode" used in client pitches — shows the full pipeline
# executing with realistic carrier data without needing a live Gmail connection.
# ─────────────────────────────────────────────────────────────────────────────

DEMO_EMAIL_BODY = """
From: noreply-arrivals@maersk.com
Subject: Arrival Notice - Vessel MSC MAYA - Port of Discharge: New York

Dear Valued Customer,

This is an automated Arrival Notice for your cargo aboard the below vessel.

Vessel Name: MSC MAYA
Voyage: 120W
Port of Discharge: New York (USNYC)
Estimated Time of Arrival: 2025-08-10

Container Details:
  Container ID: MSCU1234567
  Container Type: 40HC
  Weight: 21,400 KGS
  Commodity: General Merchandise

IMPORTANT DEMURRAGE INFORMATION:
  Free Time Deadline: 2025-08-15
  Free time allowed: 5 calendar days after vessel discharge.
  Charges after free time: USD 175/day per container.

Please arrange pickup before the free time deadline to avoid demurrage charges.

For questions, contact: usec-ops@maersk.com
"""

DEMO_EMAIL_MALFORMED_BODY = """
From: noreply@msc.com
Subject: Arrival Notice - Vessel EVER EXCEL

Arrival Notice — MSC Cargo Operations

Vessel Name: EVER EXCEL
Port of Discharge: Savannah, Georgia (USSAV)

Container: BADID999  <-- Non-standard format, will fail ISO 6346 validation

NOTE: Free time information not available at this time.
Please contact your local MSC office for demurrage terms.

Voyage Reference: 0987W
"""


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: MAIN PIPELINE ORCHESTRATOR
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(demo_mode: bool = False, demo_malformed: bool = False) -> Optional[dict]:
    """
    Main pipeline orchestrator. Executes the full intake → extract → validate
    → route workflow in sequence.

    Args:
        demo_mode      : If True, uses a clean simulated email (no live IMAP).
        demo_malformed : If True, uses a malformed simulated email to demo
                         the exception handling path.

    Returns:
        The final pipeline record dict, or None if the pipeline aborted early.
    """
    print_pipeline_banner()

    # ── Stage 1: Email Acquisition ────────────────────────────────────────────
    print(f"\n{Colors.BOLD}{'─' * 60}")
    print(f"  STAGE 1 │ EMAIL ACQUISITION LAYER")
    print(f"{'─' * 60}{Colors.RESET}")

    if demo_mode or demo_malformed:
        # Demo mode: inject a realistic simulated email body
        mode_label = "MALFORMED DEMO (Exception Path)" if demo_malformed else "CLEAN DEMO (Happy Path)"
        _print_step("DEMO MODE", f"Live IMAP skipped. Injecting simulated carrier email: {mode_label}")
        email_uid  = "DEMO-9999"
        email_body = DEMO_EMAIL_MALFORMED_BODY if demo_malformed else DEMO_EMAIL_BODY
    else:
        # Live mode: attempt real IMAP connection
        result = connect_and_fetch_arrival_notice()
        if result is None:
            _print_step("ABORT", "No email acquired. Pipeline halted cleanly.", level="WARN")
            print(f"\n{Colors.DIM}  Pipeline terminated: no unread Arrival Notice emails found, "
                  f"or IMAP connection failed.\n  Check credentials and Gmail IMAP settings.{Colors.RESET}\n")
            return None
        email_uid, email_body = result

    # ── Stage 2: Field Extraction ─────────────────────────────────────────────
    print(f"\n{Colors.BOLD}{'─' * 60}")
    print(f"  STAGE 2 │ FIELD EXTRACTION LAYER")
    print(f"{'─' * 60}{Colors.RESET}")

    extracted_fields = extract_logistics_fields(email_body)

    # ── Stage 3 & 4: Validation Gate & Routing ────────────────────────────────
    print(f"\n{Colors.BOLD}{'─' * 60}")
    print(f"  STAGE 3 │ VALIDATION GATE + ROUTING DECISION")
    print(f"{'─' * 60}{Colors.RESET}")

    pipeline_record = validate_and_triage_record(extracted_fields, email_uid)

    # ── Stage 5: Executive Summary Output ────────────────────────────────────
    print(f"\n{Colors.BOLD}{'─' * 60}")
    print(f"  STAGE 4 │ PIPELINE EXECUTION REPORT")
    print(f"{'─' * 60}{Colors.RESET}")

    print_final_summary(pipeline_record)

    return pipeline_record


# ─────────────────────────────────────────────────────────────────────────────
# ENTRYPOINT
#
# Usage:
#   python maritime_demurrage_shield.py               — Live IMAP mode
#   python maritime_demurrage_shield.py --demo         — Clean demo (happy path)
#   python maritime_demurrage_shield.py --demo-error   — Malformed demo (exception path)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]

    if "--demo-error" in args:
        # Demonstrates exception handling: malformed container ID + missing deadline
        run_pipeline(demo_mode=False, demo_malformed=True)
    elif "--demo" in args:
        # Demonstrates happy path: clean extraction + dashboard routing
        run_pipeline(demo_mode=True, demo_malformed=False)
    else:
        # Production live mode: real IMAP connection required
        if EMAIL_ACCOUNT == "YOUR_OPS_EMAIL@gmail.com":
            print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠  CONFIGURATION REQUIRED{Colors.RESET}")
            print(f"{Colors.YELLOW}  Set environment variables before running in live mode:{Colors.RESET}")
            print(f"{Colors.DIM}    export MARITIME_EMAIL='your-ops-email@gmail.com'")
            print(f"    export MARITIME_APP_PASS='your-16-char-app-password'")
            print(f"\n  Or run in demo mode:  python maritime_demurrage_shield.py --demo{Colors.RESET}\n")
            sys.exit(1)
        run_pipeline(demo_mode=False, demo_malformed=False)
