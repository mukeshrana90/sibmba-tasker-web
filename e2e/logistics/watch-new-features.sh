#!/bin/bash
# Watch mode for the 13 Oct features (v2.7.46–v2.7.49): real Chrome windows (slowed down,
# live status banner) + the Outbox viewer (http://localhost:4098) showing every email /
# WhatsApp / SMS the mocked providers capture. Needs start-test-api.sh (:4099), the web
# app (:3001) and, for s12, the admin app on :3012 (see s12-admin.js header).
cd "$(dirname "$0")"
export DISPLAY="${DISPLAY:-:0}" E2E_HEADED=1 E2E_SLOWMO="${E2E_SLOWMO:-250}"
rm -f state.json results-*.json shots/*.png outbox.jsonl progress.jsonl
ss -ltn | grep -q ':4098 ' || (nohup node outbox-viewer.js > /dev/null 2>&1 &)
sleep 1
[ -n "$NO_OPEN" ] || (google-chrome --new-window http://localhost:4098 > /dev/null 2>&1 &)
STAGES="${STAGES:-s1-owner-signup s2-fleet-operator s3-job-lifecycle s4-now-direct s5-cab s6-owner-safety s9-messaging s10-operator-onboard s12-admin s14-mobile-operator s15-whatsapp-prefs s16-forgot-password}"
for s in $STAGES; do
  echo "================ $s"
  MOCK_OUTBOX="$PWD/outbox.jsonl" E2E_SEND_GRID_SENDER=simba-e2e@e2e.example.com LOGISTICS_WA_INVITE_TEMPLATE_SID=HXe2e0000000000000000000000invite LOGISTICS_WA_SOS_TEMPLATE_SID=HXe2e000000000000000000000000sos LOGISTICS_WA_DOC_EXPIRY_TEMPLATE_SID=HXe2e00000000000000000000docexp LOGISTICS_WA_QUOTE_TEMPLATE_SID=HXe2e0000000000000000000000quote LOGISTICS_WA_JOB_STATUS_TEMPLATE_SID=HXe2e000000000000000000jobstatus LOGISTICS_WA_JOB_PIN_TEMPLATE_SID=HXe2e00000000000000000000jobpin LOGISTICS_WA_NEW_JOB_TEMPLATE_SID=HXe2e00000000000000000000newjob SEND_GRID_API_KEY=SG.e2e-fake SEND_GRID_SENDER=simba-e2e@e2e.example.com ACCOUNT_SID=ACe2e00000000000000000000000000000 AUTH_TOKEN=e2e-fake TWILIO_ACCOUNT_SID=ACe2e00000000000000000000000000000 TWILIO_AUTH_TOKEN=e2e-fake LOGISTICS_SMS_ENABLED=true LOGISTICS_WEB_URL=https://localhost:3001 timeout 1800 node $s.js 2>&1 | grep -v -i deprecation
done
node -e '
const fs=require("fs");let p=0,f=0;const fails=[];
for(const x of fs.readdirSync(".").filter(n=>n.startsWith("results-"))){const r=JSON.parse(fs.readFileSync(x));for(const c of r){c.ok?p++:(f++,fails.push(x+": "+c.section+" :: "+c.label))}}
console.log("\nTOTAL",p,"passed,",f,"failed");fails.forEach(l=>console.log("  FAIL",l));'
