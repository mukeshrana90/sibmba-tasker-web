# Logistics browser E2E (Playwright)

Drives the real web app (headless Chromium) through every logistics flow as
customer, fleet owner, operator, provider and corporate users. `/api` calls are
routed to a separate API on :4099 started with messaging OFF, so no real SMS /
email / WhatsApp is sent. OTPs and invite tokens are read from the DB.
Test users use `@e2e.example.com` emails.

## Run

```bash
# 1. web dev server (https://localhost:3001) — already running via npm start

# 2. test API on :4099 with SendGrid + Twilio mocked (nothing is really sent)
e2e/logistics/start-test-api.sh

# 3. run all stages (from sibmba-tasker-web)
npm run e2e:logistics            # or one stage: see the env block in run-all.sh

# 4. delete test data (from sibmba-tasker-backend)
node scripts/e2e-logistics-v2730.js --cleanup
```

### How email / SMS / WhatsApp are tested without real credentials

`start-test-api.sh` preloads `sibmba-tasker-backend/scripts/e2e/mock-providers.js`
into the test API (`node -r … simbaTasker.js`). It swaps the `@sendgrid/mail` and
`twilio` libraries for a fake that writes every message to `outbox.jsonl`.
Production code is unchanged: on the live server the same calls go to the real
SendGrid / Twilio with the live `.env`.

The fake rejects what the real services would reject: non-E.164 numbers,
WhatsApp without a template, and template variables that don't match
`scripts/logistics-wa-templates.json` (the same file used to create the live
templates). `MOCK_FAIL_TO` forces failures to test the error messages; `MOCK_FAIL_WA_TO` fails only WhatsApp (number not on WhatsApp) to test the invite SMS fallback. s9 reads
OTPs and invite links from the captured messages, never from the database.

### WhatsApp templates on the live server

```bash
cd sibmba-tasker-backend
node scripts/create-logistics-wa-templates.js            # dry run
node scripts/create-logistics-wa-templates.js --create   # create + submit for WhatsApp approval
node scripts/create-logistics-wa-templates.js --status   # prints the .env lines once approved
```

Stages share `state.json` (accounts, job ids), so run them in order. Failure
screenshots go to `shots/`.

## Cases

| Stage | Covers |
|---|---|
| s1-owner-signup | Equipment Owner sign-up, email OTP, owner dashboard, logout + login |
| s2-fleet-operator | Add truck, base location picker, document expiry required, fleet list, invite operator with truck, pending invite list, invite activation, auto-assignment |
| s3-job-lifecycle | Operator goes live (GPS), customer hub + search, Weight capped at the chosen Vehicle needed (4 ton → 8 t set to 4, 5000 kg → 4000 kg, no auto-upgrade, smaller sizes hidden, API rejects 5000 kg on 4 ton), dated jobs tomorrow+ (Schedule + equipment hire: today disabled, no Today button, API rejects today), truck too small for the goods (2 t truck on a 5 t job: form hidden + "none can carry"; bigger truck assigned: "switch Using now to …"; API TRUCK_TOO_SMALL with better_assets, no quote saved), post Schedule (corridor) job, operator opportunity + quote, owner view-only, accept, status 1→4, delivery OTP (wrong then right), review, owner jobs/earnings split |
| s4-now-direct | Now job (local, 30-min expiry, 50 km radius), far job hidden, local quote, accept, customer cancel, edit/remove open job, direct booking (no Now, tomorrow+), offline operator blocks booking |
| s5-cab | Add cab, 2nd operator invite, Free-plan limits (operators 2, cab 1, trucks 2: 2nd truck allowed, 3rd locked + API PLAN_LIMIT), ride request + fare estimate, cab-only visibility, quote, accept, ride PIN (wrong then right), complete without OTP, drop-off geofence report + "No issue" |
| s6-owner-safety | Emergency contacts, customer SOS hold 3 s + mark safe (operator on the job not told), operator SOS → owner banner + SOS page (customer on the job not told), paid plans off → no price/limits in the API, one blurred "Coming soon" card, no Upgrade, banner "Paid plans coming soon", activation still refused, usage rows open the active-units picker (trucks over the limit → pick + Save; equipment fits → read-only + Close; Operators → seat list + Manage operators; Enter key), operator Using now shows the plan-disabled truck greyed in "Disabled by your owner — not selectable" and preselects the usable truck, feature pin locked, add plant equipment, expired unit document hides/blocks truck |
| s11-skeletons | Every logistics route × role (desktop + 390px) with /api/logistics slowed: shimmer skeleton shown, no bare "Loading…" text, skeleton clears, no OTP/password fields in any API response (incl. Notificationlist_user, getProfile) |
| s12-admin | Admin panel (sibmba-tasker-admin on :3012 → :4099 API, JWT seeded in sessionStorage): v2.7.36 Simba Tasker | Logistics switch (menu, dashboard, SOS, Support, Notifications per module; logistics audiences + preview + "Simba Logistics:" send) + SOS Management (SOS Alerts: list, View, Acknowledge, Resolve; Helpline Numbers: add / remove, no alert copies) + Equipment Owners (search, badge, profile tabs, unit modal, earnings) + Logistics Jobs (10/page, search by customer/operator, filters, detail) + dashboard tiles + no separate ban (v2.7.44: owners list has a read-only Active / Suspended status, no Ban Owner button, old ban endpoint gone — suspend is tested in s13); operator SOS / owner support ticket / customer job report reach admin; 11 admin pages render; admin logistics-reports + logistics-sos list/resolve; SOS mirror row flips to RESOLVED; probes that admin deactivate is not enforced for role 4; no otp/password in admin responses; cleans up its rows |
| s13-accounts | Admin account actions (v2.7.36), throwaway @e2e users only: User Accounts search in both modules (admins refused), account page (equipment, operators, documents), Suspend 24h owner → operator follows (browse yes; quote no; running job continues; units hidden; web banner), suspended customer / provider blocked from new work, timed suspension auto-lifts, Delete + Undo, Permanent delete with an active job → pending → anonymized when the job ends (email @deleted.invalid, phone 000…, social/device cleared, original email free, "User no longer active" on the job), immediate delete cancels open jobs |
| s14-mobile-operator | Operator pages on phones: every operator route (dashboard, Opportunities, My Jobs, Quotes, Earnings, Analytics, Emergency contacts, Support, job detail) + owner Opportunities / Quotes / Jobs at 320 / 360 / 390 / 402 / 768px — no sideways scroll (names the element that runs off-screen), dashboard cards fit, job tables become stacked cards ≤640px (header hidden, "LABEL  value" lines not glued, cards + Quote now / View / Open buttons on-screen), filter buttons stay inside the card; desktop 1440 keeps the normal table |
| s7-smoke | Every logistics route for customer/provider/corporate/owner/operator on desktop + 390px mobile (renders, no console errors, no 5xx, no horizontal overflow) + route guards |
| s9-messaging | Email OTP sign-up (code from captured email), WhatsApp OTP sign-up (code from captured template message), WhatsApp failure message, operator invite with the owner's channel pick — default Email + WhatsApp (no SMS), WhatsApp without phone refused (UI + API INVITE_CHANNEL), WhatsApp-only to a non-WhatsApp number → SMS fallback (mock `MOCK_FAIL_WA_TO`), email-only resend (link from email activates), resend invite (old link dead), all channels failing, SOS to emergency contact by email + SMS + WhatsApp + admin email, document-expiry WhatsApp to owner + operator |
| s10-operator-onboard | Fresh owner (email-OTP sign-up) adds a truck (hidden from search without an operator); invite form checks (email required, licence expiry required); full invite with licence no/class, fixed pay, licence + medical docs, truck; invite email/SMS/WhatsApp name the company and share one link; Invited → Opened states; login hint before accepting; password checks; activation; first login (name, truck, licence-expiring warning, emergency-contacts prompt, owner pages blocked, used link dead); owner sees operator + pay in Edit; operator goes live → truck in search; duplicate email refused; plan seat lock; expired invite (state, dead link, login hint, seat freed); cancel invite; logout/login; mobile layout |
| s8-ops | Owner reassign (and back), owner reject, multi-transit run, expired operator licence blocks going live, operator login via /login |
