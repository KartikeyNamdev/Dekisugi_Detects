# Backend ↔ Worker contract

**Status: implemented on both sides.** Node backend: `backend/src/`.
Python worker: `backend-api/app/redis_worker.py` (consumer) +
`backend-api/app/services/result_adapter.py` (schema adapter). Tested
end-to-end locally with Claude mocked; see git history for the manual
integration test that exercised the full loop.

The Node backend and the Python (FastAPI) fraud-worker talk to each other
only through Redis, using plain lists/keys/pub-sub — no BullMQ, no HTTP
between the two services. This keeps the worker language-agnostic.

Note: `backend-api` also still exposes its own standalone `POST /analyze`
HTTP endpoint (see `backend-api/readme.md`) with a richer, five-verdict
response shape (`HIGH_RISK`/`MEDIUM_RISK`/.../`rbi_regulated`/etc.). That
endpoint and its test suite are untouched and still useful for testing the
worker in isolation — it's just not what the Node backend calls. The Redis
path re-uses the exact same classification pipeline
(`classify_input` / `rbi_checker` / `action_generator`) and only adapts the
*output shape* to what's documented below.

Redis is shared by both services (`REDIS_URL`). In Docker Compose this is
`redis://redis:6379` (internal network); the host-facing port is `6380`
(not `6379`) to avoid colliding with any Redis already running on the
host — see `docker-compose.yml`.

## 1. Job handoff (backend → worker)

Backend, on `POST /api/analyze`:
1. Generates `sessionId` (UUID v4).
2. `SET session:{sessionId} <job JSON> EX 300` (TTL ~5 min — zero-retention safety net).
3. `RPUSH fraud:jobs <job JSON>` — the same JSON, so the worker doesn't need a second round trip.

Worker:
- `BLPOP fraud:jobs 0` in a loop, parse each popped JSON as a job.

### Job JSON shape

```json
{
  "sessionId": "uuid",
  "type": "screenshot" | "text" | "call" | "app",
  "imageBase64": "base64 bytes, no data: prefix — present when type=screenshot",
  "imageMimeType": "image/png | image/jpeg — present when type=screenshot",
  "text": "pasted/forwarded message — present when type=text",
  "appName": "app name — present when type=app (also used for the lending-list check on any type)",
  "callDescription": "free text description of a call, transcribed client-side via Web Speech API — present when type=call",
  "language": "en",
  "createdAt": "ISO 8601 timestamp"
}
```

Exactly one of `imageBase64` / `text` / `callDescription` is populated per
`type`; `appName` may additionally be present on any type if the user also
wants the RBI lending-app check run.

## 2. Result handoff (worker → backend)

When the worker finishes a job:
1. `SET result:{sessionId} <result JSON> EX 120`
2. `PUBLISH result:{sessionId} <same result JSON>`

Do both — the backend races a key check against a pub/sub subscription to
avoid missing a fast result, and either path must work on its own.

Backend deletes `result:{sessionId}` and `session:{sessionId}` the instant
it reads the result and responds to the frontend. Nothing persists beyond
that single request/response.

### Result JSON shape

```json
{
  "sessionId": "uuid",
  "verdict": "likely_scam" | "likely_genuine" | "uncertain",
  "confidence": 0.0,
  "indicators": [
    { "label": "urgency", "detail": "..." },
    { "label": "otp_request", "detail": "..." },
    { "label": "unofficial_link", "detail": "..." },
    { "label": "impersonation", "detail": "..." }
  ],
  "summary": "one or two sentences explaining the verdict",
  "actionList": ["do this first", "then this", "..."],
  "reportingScript": "1930 / cybercrime portal script, flattened to a single string (note + fields to prepare + partner procedure text if present) — omitted for likely_genuine",
  "lendingAppCheck": {
    "appName": "...",
    "matched": true,
    "matchedEntry": "...",
    "listLastUpdated": "2026-08-01"
  },
  "sources": ["https://cybercrime.gov.in", "..."],
  "completedAt": "ISO 8601 timestamp",
  "error": "present only if the worker failed to produce a verdict — see error codes below"
}
```

`indicators[].label` values come from the worker's 16-entry indicator
taxonomy (`backend-api/app/prompts/fraud_prompt.py`: `urgency`,
`otp_request`, `unofficial_link`, `impersonation`, `fake_authority`,
`advance_fee`, `loan_harassment`, etc.) — the FE should render whatever
label comes back rather than assuming a fixed short list.

`verdict` mapping from the worker's internal five-value classification
(`backend-api/app/models.py: Verdict`), done in `result_adapter.py`:

| Internal (Claude) verdict | `verdict` in this contract |
|---|---|
| `HIGH_RISK`, `MEDIUM_RISK` | `likely_scam` |
| `LOW_RISK`, `INSUFFICIENT_INFORMATION` | `uncertain` |
| `LIKELY_LEGITIMATE` | `likely_genuine` |

`error` codes (set only when classification failed, `verdict` is forced to
`uncertain`, and generic non-AI safety guidance fills `actionList`):
`AI_TIMEOUT`, `AI_SERVICE_ERROR`, `AI_INVALID_RESPONSE`.

`lendingAppCheck` is populated **inside the worker** (`result_adapter.py`,
via `backend-api/app/services/rbi_checker.py`), only when the job includes
`appName`. The worker reads its own local file, `backend-api/data/rbi_apps.json`,
which is a *separate file* from the Node backend's
`/data/rbi-regulated-lending-apps.json` used by the standalone
`GET /api/lending-check` endpoint. Both are now generated from the same
real RBI source in one pass — see §4 — so they no longer drift apart, but
they remain two physical files (one per language's native schema), not
one shared file.

## 3. Backend HTTP surface (frontend-facing)

- `POST /api/analyze` — multipart form: `type`, one of `text` /
  `callDescription` / `appName` / a `screenshot` file, `language?`.
  Returns `202 { sessionId, status: "processing" }`.
- `GET /api/analyze/:sessionId/result` — long-polls up to
  `RESULT_WAIT_TIMEOUT_MS` (default 25s). Returns `200 <result JSON>` when
  ready, or `202 { status: "processing" }` on timeout (frontend calls again).
- `GET /api/analyze/:sessionId/status` — same shape, non-blocking single check.
- `GET /api/lending-check?appName=...` — `{ appName, matched, matchedEntry?, listLastUpdated, listSource }`.
- `GET /api/health` — `{ status, redis }`.

## 4. RBI data — real, sourced from RBI's official export

Both `/data/rbi-regulated-lending-apps.json` (Node) and
`backend-api/data/rbi_apps.json` (Python) are generated by
**`scripts/build_rbi_lists.py`** from a real export of RBI's Digital
Lending Apps (DLA) directory (704 unique app names / 1,234 entity-app
records, as of the export date recorded in each file's `lastUpdated` /
`last_updated` field).

RBI's site actively blocks non-browser requests (its own `robots.txt`
returns "Unauthorised Access" to a plain `curl`, and the directory itself
is a JavaScript-only SAP BusinessObjects dashboard) — this is not
automatable, and deliberately isn't automated here. To refresh the data:

1. In a real browser, open:
   `https://data.rbi.org.in/BOE/OpenDocument/opendoc/custom.jsp?sIDType=CUID&iDocID=ARfEgy.WNSVIvFfvSIVmBCw`
   (via rbi.org.in → Citizen's Corner → "DLA's deployed by Regulated Entities").
2. Use the toolbar's Export to download the directory as `.xlsx`.
3. Run: `python3 scripts/build_rbi_lists.py path/to/DigitalLendingApp.xlsx`
   — this regenerates both JSON files from that one export, so they can't
   drift apart from each other.

The script also drops a small number of junk placeholder rows RBI's own
export contains (bare digits / "NA" as a "DLA name" — self-reporting
errors from the regulated entities, not something invented here) and
forward-fills the Entity Name column, which the export stores as merged
Excel cells spanning each entity's app rows.

`/data/rbi-regulated-lending-apps.json` shape:

```json
{ "source": "...", "lastUpdated": "YYYY-MM-DD", "apps": ["App Name", "..."] }
```

`backend-api/data/rbi_apps.json` shape (see §2 above — this is what
`rbi_checker.py`'s fuzzy match reads):

```json
{
  "source": "...",
  "last_updated": "YYYY-MM-DD",
  "apps": [
    { "name": "...", "aliases": [], "entity": "...", "entityType": "NBFC", "link": "..." }
  ]
}
```
