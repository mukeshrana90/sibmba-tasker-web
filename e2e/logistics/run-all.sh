#!/bin/bash
cd "$(dirname "$0")"
rm -f state.json results-*.json shots/*.png outbox.jsonl
for s in s1-owner-signup s2-fleet-operator s3-job-lifecycle s4-now-direct s5-cab s6-owner-safety s7-smoke s8-ops s9-messaging s10-operator-onboard s11-skeletons s12-admin s13-accounts; do
  echo "================ $s"
  MOCK_OUTBOX="$PWD/outbox.jsonl" E2E_SEND_GRID_SENDER=simba-e2e@e2e.example.com LOGISTICS_WA_INVITE_TEMPLATE_SID=HXe2e0000000000000000000000invite LOGISTICS_WA_SOS_TEMPLATE_SID=HXe2e000000000000000000000000sos LOGISTICS_WA_DOC_EXPIRY_TEMPLATE_SID=HXe2e00000000000000000000docexp SEND_GRID_API_KEY=SG.e2e-fake SEND_GRID_SENDER=simba-e2e@e2e.example.com ACCOUNT_SID=ACe2e00000000000000000000000000000 AUTH_TOKEN=e2e-fake TWILIO_ACCOUNT_SID=ACe2e00000000000000000000000000000 TWILIO_AUTH_TOKEN=e2e-fake LOGISTICS_SMS_ENABLED=true LOGISTICS_WEB_URL=https://localhost:3001 timeout 900 node $s.js 2>&1 | grep -v -i deprecation
done
node -e '
const fs=require("fs");let p=0,f=0;const fails=[];
for(const x of fs.readdirSync(".").filter(n=>n.startsWith("results-"))){const r=JSON.parse(fs.readFileSync(x));for(const c of r){c.ok?p++:(f++,fails.push(x+": "+c.section+" :: "+c.label))}}
console.log("\nTOTAL",p,"passed,",f,"failed");fails.forEach(l=>console.log("  FAIL",l));'
