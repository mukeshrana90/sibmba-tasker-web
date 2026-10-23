#!/bin/bash
# Demo API (:4099) for the client flow screenshots — ../start-test-api.sh with its own DB (SimbaTaskerFlowDemo),
# its own outbox and the cab service OFF. Messaging is mocked: nothing leaves this machine.
export DB_URL="${DEMO_DB_URL:-mongodb://localhost:27017/SimbaTaskerFlowDemo}"
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/../../../../sibmba-tasker-backend"
export PORT=4099 MOCK_OUTBOX="$HERE/outbox.jsonl" MOCK_FAIL_TO='^\+26371999|^fail\.'
export MOCK_FAIL_WA_TO='^\+26371888'
export SEND_GRID_API_KEY=SG.e2e-fake SEND_GRID_SENDER=simba-e2e@e2e.example.com
export ACCOUNT_SID=ACe2e00000000000000000000000000000 AUTH_TOKEN=e2e-fake
export TWILIO_ACCOUNT_SID=ACe2e00000000000000000000000000000 TWILIO_AUTH_TOKEN=e2e-fake FCM_SERVER_KEY=
export LOGISTICS_SMS_ENABLED=true LOGISTICS_WEB_URL=https://localhost:3001
export LOGISTICS_WA_INVITE_TEMPLATE_SID=HXe2e0000000000000000000000invite
export LOGISTICS_WA_SOS_TEMPLATE_SID=HXe2e000000000000000000000000sos
export LOGISTICS_WA_DOC_EXPIRY_TEMPLATE_SID=HXe2e00000000000000000000docexp
# v2.7.49 job alerts (quote received, trip steps, delivery code, new job nearby)
export LOGISTICS_WA_QUOTE_TEMPLATE_SID=HXe2e0000000000000000000000quote
export LOGISTICS_WA_JOB_STATUS_TEMPLATE_SID=HXe2e000000000000000000jobstatus
export LOGISTICS_WA_JOB_PIN_TEMPLATE_SID=HXe2e00000000000000000000jobpin
export LOGISTICS_WA_NEW_JOB_TEMPLATE_SID=HXe2e00000000000000000000newjob
# Straight-line distance in tests (no calls to the public OSRM router); priority fee USD 5
export LOGISTICS_ROAD_DISTANCE=false LOGISTICS_PRIORITY_FEE=5
export LOGISTICS_ADMIN_ALERT_EMAILS=sos-admin@e2e.example.com
export LOGISTICS_SOS_SMS_WEBHOOK_TOKEN=e2e-sms-token EMAIL_CHECK_ALLOW_DOMAINS=e2e.example.com,moyohaulage.demo,mail.demo
export LOGISTICS_DOC_REMINDER_HOUR=25 CAB_SERVICE_ENABLED=false
exec node -r ./scripts/e2e/mock-providers.js simbaTasker.js
