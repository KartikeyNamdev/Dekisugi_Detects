# Is This a Scam? — Fraud Worker Pool (Backend)

A FastAPI service that analyzes a suspicious text message, screenshot, and/or app name
and returns a structured, explainable fraud-risk assessment using the Claude API
(including Claude's vision capability for screenshots).

Built for a hackathon. Privacy-first: nothing submitted is written to disk or a
database — everything is processed in memory for the duration of the request and
discarded once the response is sent.

---

## 1. Features

- `POST /analyze` — accepts a message, an optional screenshot, and/or an optional
  app name; returns a structured fraud verdict, confidence, indicators, an
  explanation, RBI-lending-app lookup, and next-step action guidance.
- Claude Vision support — screenshots are sent directly to Claude; there is no
  separate OCR step.
- Few-shot fraud taxonomy (`data/taxonomy.json`) with ~18 scam and ~18 genuine
  synthetic examples used as in-context examples for the classifier.
- RBI regulated-lending-app lookup against a local JSON list
  (`data/rbi_apps.json`) — **ships with placeholder/sample data only**, see
  the warning in section 6.
- Structured JSON output validated with Pydantic; the API never crashes or
  passes through malformed model output — invalid/unparseable AI responses
  are converted into a clean `AI_SERVICE_ERROR`.
- No persistence: no database, no file writes of user input, no logging of
  message bodies, app names, or images.
- Test suite covering scam/genuine classification (with the Claude call
  mocked), schema validation, RBI lookup, and error handling.

---

## 2. Project structure

```text
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, router wiring
│   ├── models.py                # Pydantic request/response schemas
│   ├── routes/
│   │   └── analyze.py           # POST /analyze
│   ├── services/
│   │   ├── claude_service.py    # Claude API client wrapper (text + vision)
│   │   ├── fraud_classifier.py  # Builds prompt, calls Claude, validates JSON
│   │   ├── rbi_checker.py       # Local RBI app-name lookup
│   │   └── action_generator.py  # Immediate actions + reporting script
│   └── prompts/
│       └── fraud_prompt.py      # System prompt + few-shot builder
│
├── data/
│   ├── taxonomy.json                 # Synthetic scam/genuine examples
│   ├── rbi_apps.json                 # PLACEHOLDER RBI-regulated app list
│   └── post_incident_procedure.txt   # Placeholder for partner-provided text
│
├── tests/
│   ├── test_classifier.py
│   └── test_rbi_checker.py
│
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and paste in your own Anthropic API key
```

### Environment variables (`.env`)

```env
ANTHROPIC_API_KEY=sk-ant-...      # your key — never commit this file
CLAUDE_MODEL=claude-sonnet-5      # any current Claude model with vision support
CLAUDE_TIMEOUT_SECONDS=25         # optional, defaults to 25
```

> **Never hardcode the API key.** `.env` is already listed in `.gitignore`.
> If a key is ever pasted into a chat, screenshot, README, or commit, treat
> it as compromised and regenerate it in the Anthropic Console immediately.

### Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`, with interactive docs at
`http://localhost:8000/docs`.

---

## 4. API

### `POST /analyze`

Accepts **`multipart/form-data`** (not raw JSON) because it needs to support
an optional binary image upload alongside text fields — this is the practical
shape a React frontend will send with `FormData`.

| Field      | Type          | Required | Notes                                   |
|------------|---------------|----------|------------------------------------------|
| `text`     | string        | No*      | The suspicious message text              |
| `app_name` | string        | No       | App name to check against the RBI list   |
| `image`    | file (upload) | No*      | Screenshot — jpeg/png/webp, max ~8 MB    |

\* At least one of `text` or `image` must be provided.

**Example (curl):**

```bash
curl -X POST http://localhost:8000/analyze \
  -F "text=Your KYC has expired. Click this link immediately to avoid account suspension." \
  -F "app_name="
```

**Example with a screenshot:**

```bash
curl -X POST http://localhost:8000/analyze \
  -F "text=" \
  -F "image=@/path/to/screenshot.png" \
  -F "app_name=QuickCash Loans"
```

**Example response:**

```json
{
  "verdict": "HIGH_RISK",
  "confidence": 0.94,
  "scam_type": "KYC Scam",
  "summary": "The message combines an urgent KYC threat with an unofficial link and pressure to act immediately.",
  "indicators": [
    { "type": "urgency", "evidence": "Immediate action is demanded to avoid account suspension." },
    { "type": "unofficial_link", "evidence": "The verification link does not point to an official bank domain." }
  ],
  "recommended_action": [
    "Do not click the link.",
    "Do not share OTP or banking credentials.",
    "Verify the message using the institution's official website or app."
  ],
  "rbi_regulated": null,
  "rbi_match": null,
  "immediate_actions": [
    "Do not click the suspicious link.",
    "Do not share OTP, PIN or password.",
    "Contact the institution using its official website or app."
  ],
  "reporting_script": {
    "note": "Prepare this information before reporting or contacting your bank.",
    "fields_to_prepare": [
      "Transaction / reference ID (if any)",
      "Approximate date and time you received the message",
      "Amount involved (if money was requested or transferred)",
      "Sender's phone number, email, or app used",
      "Screenshots of the message or app"
    ]
  }
}
```

If `app_name` is supplied, `rbi_regulated` will be `true`, `false`, or the
string `"NOT_FOUND"` (see section 6). If no app name is supplied, it stays
`null`.

**Error response shape** (never a raw stack trace):

```json
{ "error": "Unable to analyze the message right now.", "code": "AI_SERVICE_ERROR" }
```

Error codes used: `INVALID_INPUT`, `EMPTY_INPUT`, `UNSUPPORTED_FILE_TYPE`,
`IMAGE_TOO_LARGE`, `AI_SERVICE_ERROR`, `AI_TIMEOUT`, `AI_INVALID_RESPONSE`.

---

## 5. Response schema

See `app/models.py` for the authoritative Pydantic definitions. Key enums:

- `verdict`: `HIGH_RISK` | `MEDIUM_RISK` | `LOW_RISK` | `LIKELY_LEGITIMATE` | `INSUFFICIENT_INFORMATION`
- `indicators[].type`: one of the 16 indicator types listed in
  `app/prompts/fraud_prompt.py` (urgency, OTP_request, unofficial_link, etc.)
- `rbi_regulated`: `true` | `false` | `"NOT_FOUND"` | `null`

---

## 6. RBI app list — real data, refresh it before a stale demo

`data/rbi_apps.json` is generated from a real export of RBI's public
Digital Lending Apps (DLA) directory (1,234 entity/app records as of the
`last_updated` date inside the file) via `scripts/build_rbi_lists.py` at
the repo root — see `/CONTRACT.md` §4 for exactly how to re-export and
regenerate it, since RBI's site can't be scraped automatically (it blocks
non-browser requests) and needs a human to re-download the `.xlsx` by hand
periodically.

The API itself is designed to never overclaim: if an app isn't found in the
local file, the response is `"NOT_FOUND"` (not `false`), and the app never
states that absence from the list is proof of fraud — that framing is baked
into the prompt and the fraud_classifier's post-processing.

Similarly, `data/post_incident_procedure.txt` is a placeholder. The code
is structured to load real partner-provided reporting-procedure text from
that file once it's supplied; until then, `action_generator.py` only
surfaces generic, non-authoritative safety steps (don't click links, don't
share OTPs, contact your bank/the official app) and a generic list of
information to prepare — it does not invent specific official procedures
(like exact helpline scripts) on the file's behalf.

---

## 7. Privacy

- No database. No ORM. No persistent storage of any kind.
- Uploaded images are read into memory, base64-encoded for the Claude API
  call, and discarded when the request finishes — never written to disk.
- The app's logging config (`app/main.py`) deliberately avoids logging
  request bodies, form fields, or image bytes. Only high-level events
  (e.g. "analyze request received", HTTP status, latency) are logged.
- No OTPs, passwords, PINs, phone numbers, or account numbers are ever
  requested by the assistant — this is enforced in the system prompt and
  spot-checked in tests.

---

## 8. Testing

```bash
pytest -v
```

Tests mock `claude_service` so they run offline, deterministically, and
without needing an API key. They cover:

- JSON validity / schema conformance for every scam + genuine test case
- Confidence in `[0, 1]`
- Verdict is one of the five allowed values
- Indicator extraction for each scam category
- RBI lookup: match / no-match / not-found cases
- Error handling: empty input, oversized image, bad file type, malformed
  Claude output, simulated Claude API failure

The **false-positive suite** (`test_classifier.py::test_genuine_examples_not_flagged_high_risk`)
runs every genuine example in `data/taxonomy.json` through the classifier
(mocked to return realistic "legitimate" responses matching the prompt's
contract) and asserts none come back `HIGH_RISK`.

---

## 9. Known hackathon-scope limitations

- No auth/rate limiting — add before any real deployment.
- Image size cap is a simple byte-length check (default 8 MB), not deep
  file-type sniffing beyond content-type + magic-byte checks.
- RBI matching is normalization + fuzzy substring matching, not a
  government-grade entity-resolution system.
- `post_incident_procedure.txt` intentionally ships empty/placeholder per
  the project brief — do not treat generated `reporting_script` output as
  an official procedure.
