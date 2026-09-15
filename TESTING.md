# Testing guide — Is This a Scam?

## Right now, this is already running for you

| Service | URL | Notes |
|---|---|---|
| Frontend (Next.js) | http://localhost:3001 | Open this in your browser |
| Node backend | http://localhost:3000 | `GET /api/health` → `{"status":"ok","redis":"ok"}` |
| Python worker | (no port — Redis consumer) | Connected, using your real Anthropic API key |
| Redis | localhost:6380 | Isolated instance, **not** your system Redis on 6379 |

Just open **http://localhost:3001** and click around. Real Claude calls are
happening — each submission takes a few seconds while the worker classifies it.

Skip to [Test cases to paste](#test-cases-to-paste) if you just want to try it.

---

## 1. Browser walkthrough

1. **http://localhost:3001/** — home page, four tiles.
2. **/message** — paste a scam/genuine SMS text, submit, watch it redirect to
   `/result/<sessionId>` and show a verdict after a few seconds.
3. **/screenshot** — drag an image in (or click to choose one), submit. Try a
   real screenshot of a suspicious message/app if you have one — Claude's
   vision capability reads it directly, no separate OCR.
4. **/call** — click **🎤 Record** (Chrome/Edge only — Web Speech API isn't
   supported in Firefox/Safari, the page will say so and let you type
   instead), speak a description, click **Stop recording**, then submit.
   Audio never leaves your device — only the transcribed text is sent.
5. **/app-check** — type an app name, submit. This one is instant (no Claude
   call, just a local list lookup) — see the known limitation below.

On the result page you should see: a colored verdict badge, confidence %,
a summary sentence, a list of specific indicators, a "next 10 minutes"
action list, and a reporting script block.

### Known limitation to expect while testing

The RBI regulated-lending-app list is placeholder/sample data on both
sides (`data/rbi-regulated-lending-apps.json` used by `/app-check`, and
`backend-api/data/rbi_apps.json` used inside the full analysis flow) — real
app names will come back "not found," and the two lists aren't the same
list yet. This is flagged in `CONTRACT.md` §2 as a pre-demo TODO, not a bug.

---

## 2. Test cases to paste

Paste these into **/message** (or the equivalent field) to exercise a
representative spread. Expected verdict is what the classifier *should*
say — worth checking each result against it.

### Scams — expect `likely_scam`

**1. KYC expiry (bank impersonation)**
```
Dear customer, your KYC has expired. Click http://kyc-verify-bank.xyz/update within 24 hours or your account will be permanently blocked. Do not ignore this urgent message.
```

**2. Loan-app harassment**
```
This is your final warning. You have not repaid your QuickCash loan. We have your contacts and will inform all of them about your default within 2 hours if payment is not made now. Pay immediately to avoid embarrassment.
```

**3. Courier/customs fee**
```
Your parcel from international courier is on hold at customs. Pay a clearance fee of Rs 249 within 3 hours via this link to release it: http://track-parcel-fee.info/pay - failure to pay will result in the parcel being returned.
```

**4. Investment/trading group**
```
Our trading group members made 40% returns this week! Join our exclusive VIP investment group now, limited slots. Guaranteed profits, no risk. Send Rs 5000 to get started and see real results within days.
```

**5. Job registration fee**
```
Congratulations! You are selected for a work-from-home data entry job paying Rs 30,000/month. To confirm your seat, pay a one-time registration fee of Rs 1500 to our official partner within 24 hours.
```

**6. Digital arrest** — use the **/call** page (this is a call-description
scenario, not a text message):
```
A man called claiming to be from the Mumbai Cyber Crime police. He said a parcel with my Aadhaar and drugs was intercepted, that there is a warrant for my arrest, and that I must stay on a video call and transfer money to a "RBI verification account" to prove my innocence or I will be arrested within the hour.
```

### Genuine — expect `likely_genuine` (false-positive check)

**7. Real bank alert**
```
HDFC Bank: Rs 2,450.00 debited from A/c XX1234 on 15-SEP-26 at AMAZON PAY. Avl bal: Rs 18,320.50. Not you? Call 1800-XXX-XXXX.
```

**8. Real courier delivery update**
```
Your Delhivery order #DL9834521 is out for delivery today between 2-6 PM. Track: delhivery.com/track/DL9834521. Contact the delivery partner via the app if you're unavailable.
```

If any of #7–8 come back `likely_scam`, that's a real false-positive to
flag — the project's stated success criterion is a low false-alarm rate on
genuine institutional communication.

### App check

Paste any of these into **/app-check** — since the RBI list is placeholder
data (see limitation above), every real name will currently say "not
found," which is the expected/correct behavior for an unlisted app (not a
bug):
```
QuickCash Loans
CASHe
```

---

## 3. Testing the backend directly (no browser)

Useful for isolating whether an issue is frontend or backend.

```bash
# Health check
curl -s localhost:3000/api/health

# Submit a text message
curl -s -X POST localhost:3000/api/analyze \
  -F "type=text" \
  -F "text=Your KYC will expire, click this link immediately."
# → {"sessionId":"...","status":"processing"}

# Fetch the result (long-polls up to ~25s)
curl -s localhost:3000/api/analyze/<sessionId>/result

# Submit a screenshot
curl -s -X POST localhost:3000/api/analyze \
  -F "type=screenshot" \
  -F "screenshot=@/path/to/image.png"

# Submit a call description
curl -s -X POST localhost:3000/api/analyze \
  -F "type=call" \
  -F "callDescription=Someone claiming to be from the police said I'm under digital arrest."

# App lending-list check (instant, synchronous)
curl -s "localhost:3000/api/lending-check?appName=QuickCash%20Loans"
```

### Watching the worker's logs

The worker process logs each job it picks up and the verdict it produces
(never the message content itself — see the privacy notes in
`backend-api/readme.md`). If a result never arrives, check there first.

---

## 4. Starting everything from scratch

If you restart your machine or want a clean run, start these **in order**
(each depends on the one before it):

```bash
# 1. Redis — isolated on 6380 so it never touches any Redis you already run on 6379
redis-server --daemonize yes --port 6380 --save "" --appendonly no

# 2. Node backend
cd backend
REDIS_URL=redis://localhost:6380 npm run dev
# (separate terminal)

# 3. Python worker — needs backend-api/.env with a real ANTHROPIC_API_KEY
cd backend-api
source venv/bin/activate   # or: venv/bin/python -m app.redis_worker directly
python -m app.redis_worker
# (separate terminal)

# 4. Frontend
cd frontend
npm run dev -- -p 3001
```

Then open http://localhost:3001.

### Or with Docker Compose (one command, once you're ready)

```bash
cp .env.example .env        # fill in ANTHROPIC_API_KEY
docker compose up --build
```

Frontend → http://localhost:3001, backend → http://localhost:3000, Redis
exposed on host 6380 only (internal container traffic uses 6379).

### Stopping everything

```bash
# Whatever you started manually:
pkill -f "tsx src/index.ts"        # Node backend
pkill -f "app.redis_worker"        # Python worker
pkill -f "next dev"                # Frontend
redis-cli -p 6380 shutdown nosave  # Redis (only the isolated test instance)

# Or, for Docker Compose:
docker compose down
```

---

## 5. Troubleshooting

- **Result page hangs on "Analyzing…" forever** — check the worker's
  terminal/log for an error. Most likely cause: `ANTHROPIC_API_KEY` missing
  or invalid in `backend-api/.env`, or the worker isn't running at all.
- **`ECONNREFUSED` from the Node backend** — Redis isn't reachable. Confirm
  `redis-cli -p 6380 ping` returns `PONG`, and that `REDIS_URL` matches on
  both the backend and the worker.
- **CORS error in the browser console** — confirm `NEXT_PUBLIC_API_BASE_URL`
  in `frontend/.env.local` points at `http://localhost:3000`, and that the
  backend's `CORS_ORIGIN` isn't restricted to something else.
- **Voice recording button says "not supported"** — expected in
  Firefox/Safari; use Chrome or Edge, or type into the textarea instead.
- **Port 6379 conflicts** — this project intentionally never binds host
  6379 (see `docker-compose.yml` and `CONTRACT.md`) specifically because a
  Redis instance for another project may already be running there. If you
  see a 6379 conflict, something is pointing at the wrong `REDIS_URL`.
