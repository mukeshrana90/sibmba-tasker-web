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

**File uploads:** Chromium hands intercepted requests to Playwright without the bytes of attached files, so `lib.js` sends `FormData` requests from the page straight to a local HTTPS relay that pipes them to the test API (before 19 Oct every upload in these stages reached the API as an empty file). Generated upload fixtures go to `fixtures/gen/` (git-ignored).

Stages share `state.json` (accounts, job ids), so run them in order. Failure
screenshots go to `shots/`.

## Cases

v2.7.50 notes: WhatsApp to owners / operators is paid-plan only — s9 puts its owners on Paid with `L.setPlan(id, "paid")`; s3 checks the Free owner gets **no** WhatsApp; s10 (Free owner) checks the WhatsApp invite option is disabled and the invite goes by email only. Watch it in a real browser: `e2e/logistics/watch-new-features.sh` (headed Chrome + Outbox viewer http://localhost:4098 — `node e2e/logistics/outbox-viewer.js` shows every captured email / WhatsApp / SMS as the user would see it, plus the WhatsApp template catalogue).

v2.7.49 notes: fresh owners in s1 / s9 / s10 are approved through the admin API (`L.approveOwner`); test units upload a Road licence (ZINARA) with a future expiry (it's required now); the test API sets the four job-alert WhatsApp SIDs, `LOGISTICS_PRIORITY_FEE=5` and `LOGISTICS_ROAD_DISTANCE=false`. s3 also checks the quote's saved location, new-quote / trip-step / delivery-code WhatsApps, owner job-update notices and the priority fee (session, Post job label, `price_summary` 280 + 5 = 285, customer page, owner earnings). s6 checks the document rules (expired ZINARA hides, expired insurance doesn't, missing / rejected ZINARA hides, red-plate roadworthy, expiry of today refused).

| Stage | Covers |
|---|---|
| s1-owner-signup | Equipment Owner sign-up, email OTP, owner dashboard, logout + login; v2.7.49: new company starts Pending (banner, `/me` approval, can't take work) → admin approves (`L.approveOwner`, approval email) → banner gone |
| s2-fleet-operator | Add truck, base location picker, document expiry required, fleet list, invite operator with truck, pending invite list, invite activation, auto-assignment |
| s3-job-lifecycle | Operator goes live (GPS), customer hub + search, Weight capped at the chosen Vehicle needed (4 ton → 8 t set to 4, 5000 kg → 4000 kg, no auto-upgrade, smaller sizes hidden, API rejects 5000 kg on 4 ton), dated jobs tomorrow+ (Schedule + equipment hire: today disabled, no Today button, API rejects today), truck too small for the goods (2 t truck on a 5 t job: form hidden + "none can carry"; bigger truck assigned: "switch Using now to …"; API TRUCK_TOO_SMALL with better_assets, no quote saved), post Schedule (corridor) job, operator opportunity + quote, owner view-only, accept, status 1→4, delivery OTP (wrong then right), review, owner jobs/earnings split |
| s4-now-direct | Now job (local, 30-min expiry, 50 km radius), far job hidden, local quote, accept, customer cancel, edit/remove open job, direct booking (no Now, tomorrow+), offline operator blocks booking |
| s5-cab | Add cab, 2nd operator invite, Free-plan limits (operators 2, cab 1, trucks 2: 2nd truck allowed, 3rd locked + API PLAN_LIMIT), ride request + fare estimate, cab-only visibility, quote, accept, ride PIN (wrong then right), complete without OTP, drop-off geofence report + "No issue" |
| s6-owner-safety | Emergency contacts, customer SOS hold 3 s + mark safe (operator on the job not told), operator SOS → owner banner + SOS page (customer on the job not told), paid plans off → no price/limits in the API, one blurred "Coming soon" card, no Upgrade, banner "Paid plans coming soon", activation still refused, usage rows open the active-units picker (trucks over the limit → pick + Save; equipment fits → read-only + Close; Operators → seat list + Manage operators; Enter key), operator Using now shows the plan-disabled truck greyed in "Disabled by your owner — not selectable" and preselects the usable truck, feature pin locked, add plant equipment (no default machine: e.g. hint placeholders, save refused without Equipment / Sub type, Sub type first opens the Equipment picker), expired unit document hides/blocks truck |
| s11-skeletons | Every logistics route × role (desktop + 390px) with /api/logistics slowed: shimmer skeleton shown, no bare "Loading…" text, skeleton clears, no OTP/password fields in any API response (incl. Notificationlist_user, getProfile) |
| s12-admin | v2.7.49 approval gate: Pending approval tab + Docs to check, Verify ZINARA / Reject insurance (reason required), reject company (email) then approve (email, units unhidden). Admin panel (sibmba-tasker-admin on :3012 → :4099 API, JWT seeded in sessionStorage): v2.7.36 Simba Tasker | Logistics switch (menu, dashboard, SOS, Support, Notifications per module; logistics audiences + preview + "Simba Logistics:" send) + SOS Management (SOS Alerts: list, View, Acknowledge, Resolve; Helpline Numbers: add / remove, no alert copies) + Equipment Owners (search, badge, profile tabs, unit modal, earnings) + Logistics Jobs (10/page, search by customer/operator, filters, detail) + dashboard tiles + no separate ban (v2.7.44: owners list has a read-only Active / Suspended status, no Ban Owner button, old ban endpoint gone — suspend is tested in s13); operator SOS / owner support ticket / customer job report reach admin; 11 admin pages render; admin logistics-reports + logistics-sos list/resolve; SOS mirror row flips to RESOLVED; probes that admin deactivate is not enforced for role 4; no otp/password in admin responses; cleans up its rows |
| s13-accounts | Admin account actions (v2.7.36), throwaway @e2e users only: User Accounts search in both modules (admins refused), account page (equipment, operators, documents), Suspend 24h owner → operator follows (browse yes; quote no; running job continues; units hidden; web banner), suspended customer / provider blocked from new work, timed suspension auto-lifts, Delete + Undo, Permanent delete with an active job → pending → anonymized when the job ends (email @deleted.invalid, phone 000…, social/device cleared, original email free, "User no longer active" on the job), immediate delete cancels open jobs |
| s14-mobile-operator | Operator pages on phones: every operator route (dashboard, Opportunities, My Jobs, Quotes, Earnings, Analytics, Emergency contacts, Support, job detail) + owner Opportunities / Quotes / Jobs at 320 / 360 / 390 / 402 / 768px — no sideways scroll (names the element that runs off-screen), dashboard cards fit, job tables become stacked cards ≤640px (header hidden, "LABEL  value" lines not glued, cards + Quote now / View / Open buttons on-screen), filter buttons stay inside the card, two-row phone header (≤560px: full-width Tasker|Logistics switch on top, logo · bell · profile · menu below, menu last), dashboard location map stays inside its card and the GPS badge doesn't cover the zoom buttons; desktop 1440 keeps the normal table |
| s7-smoke | Every logistics route for customer/provider/corporate/owner/operator on desktop + 390px mobile (renders, no console errors, no 5xx, no horizontal overflow) + route guards |
| s9-messaging | Email OTP sign-up (code from captured email), WhatsApp OTP sign-up (code from captured template message), WhatsApp failure message, operator invite with the owner's channel pick — default Email + WhatsApp (no SMS), WhatsApp without phone refused (UI + API INVITE_CHANNEL), WhatsApp-only to a non-WhatsApp number → SMS fallback (mock `MOCK_FAIL_WA_TO`), email-only resend (link from email activates), resend invite (old link dead), all channels failing, SOS to emergency contact by email + SMS + WhatsApp + admin email, document-expiry WhatsApp to owner + operator |
| s10-operator-onboard | Fresh owner (email-OTP sign-up) adds a truck (hidden from search without an operator); invite form checks (email required, licence expiry required); full invite with licence no/class, fixed pay, licence + medical docs, truck; invite email/SMS/WhatsApp name the company and share one link; Invited → Opened states; login hint before accepting; password checks; activation; first login (name, truck, licence-expiring warning, emergency-contacts prompt, owner pages blocked, reopened link says “Already accepted — log in” (also after its expiry date; Log in pre-fills the email), cancelled link “no longer valid”); owner sees operator + pay in Edit; operator goes live → truck in search; duplicate email refused; plan seat lock; expired invite (state, dead link, login hint, seat freed); cancel invite; logout/login; mobile layout |
| s15-whatsapp-prefs | v2.7.50 WhatsApp notifications: Free plan card "WhatsApp notifications ✗", profile switch locked for a Free owner + operator ("paid fleet plans" / "Ask your fleet owner"), invite form WhatsApp disabled ("Paid plans only") + API `WHATSAPP_PAID_ONLY`, no WhatsApp to a Free owner / operator; Paid (`L.setPlan`) → switch on by default, plan card ✓, WhatsApp delivered; owner switches OFF in the browser → skipped (opted_out), operator unaffected, stays off after reload, back ON → delivered; customer switch on → off → on; non-boolean refused. Sends go through the real `jobWhatsapp.sendJobWhatsapp` with mocked Twilio. Resets the fleet to Free at the end. |
| s16-forgot-password | v2.7.51 Tasker forgot password (own throwaway corporate + customer): channel picker shows the phone masked ("••• ••• 123") — full number not in the page or the API response, lookup step sends nothing; email path: one email captured, code read from it, resetPass before verify refused (RESET_NOT_VERIFIED), wrong code "Invalid OTP", right code → new password works / old fails, window + codes cleared, second reset refused; WhatsApp path: OTP template to the stored number, reset, login with the new password; a request naming another number still goes to the stored one; object email refused; verify >30 min after request / reset after 10 min refused; codes live on `users` (email_otp / phone_otp / whatsapp_otp / password_reset). Deletes its users. |
| s17-uploads | Upload rules (19 Oct): Fleet add form, unit edit, Post job (+ edit), operator invite — every picker refuses >10 MB and other types (toast), photo pickers refuse PDF / Word; iPhone HEIC (`fixtures/iphone-photo.heic`) stored as a real JPEG ≤1920px + `thumb_`, 2400px JPG resized, PDF stored byte-for-byte, photos render on the unit + job pages; API without the web checks: 10 MB + 1 → `FILE_TOO_LARGE`, exactly 10 MB accepted, `.exe` / PDF-as-photo / Word-as-photo → `FILE_TYPE_NOT_ALLOWED`, corrupt JPG / fake `.heic` → `IMAGE_UNREADABLE` (no 500), extension-less HEIC detected by its bytes, DOCX paper kept |
| s18-uploads-more | Upload cases s17 doesn't cover (fresh Paid owner): corrupt photo on Add truck + Post job → server `IMAGE_UNREADABLE`, "can't be read" toast, form kept, nothing saved; exactly-10 MB photo (stored resized < 1 MB) + 10 MB PDF (byte-for-byte); DOCX paper; JPEG named `.heic`; unit page Edit replaces papers (.heif insurance → JPEG, oversized / .zip refused, untouched paper kept); cab (.heif photo, "mif1" HEIF permit); equipment (HEIC without extension, HEIC named `.jpg` → no `.jpg.jpg`); operator invite → activation → own photo shown; owner edits the operator (new .heif photo, HEIC medical, oversized refused) → operator sees the new photo; operator live → Search card + customer unit page show the converted photos; round-trip return photos (>10 MB / .docx refused, HEIC + HEIF stored as JPEG, shown on the job page); equipment hire site photos; Post job on a 390px phone (toast fits, previews, no sideways scroll, job page photos) |
| s8-ops | Owner reassign (and back), owner reject, multi-transit run, expired operator licence blocks going live, operator login via /login |
