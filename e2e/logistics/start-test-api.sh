#!/bin/bash
# Test API on :4099 with SendGrid + Twilio replaced by a local outbox (scripts/e2e/mock-providers.js).
# Fake credentials make every send code path run; nothing leaves this machine.
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/../../../sibmba-tasker-backend"
export PORT=4099 MOCK_OUTBOX="$HERE/outbox.jsonl" MOCK_FAIL_TO='^\+26371999|^fail\.'
export MOCK_FAIL_WA_TO='^\+26371888'
export SEND_GRID_API_KEY=SG.e2e-fake SEND_GRID_SENDER=simba-e2e@e2e.example.com
export ACCOUNT_SID=ACe2e00000000000000000000000000000 AUTH_TOKEN=e2e-fake
export TWILIO_ACCOUNT_SID=ACe2e00000000000000000000000000000 TWILIO_AUTH_TOKEN=e2e-fake FCM_SERVER_KEY=
export LOGISTICS_SMS_ENABLED=true LOGISTICS_WEB_URL=https://localhost:3001
export LOGISTICS_WA_INVITE_TEMPLATE_SID=HXe2e0000000000000000000000invite
export LOGISTICS_WA_SOS_TEMPLATE_SID=HXe2e000000000000000000000000sos
export LOGISTICS_WA_DOC_EXPIRY_TEMPLATE_SID=HXe2e00000000000000000000docexp
export LOGISTICS_ADMIN_ALERT_EMAILS=sos-admin@e2e.example.com
export LOGISTICS_SOS_SMS_WEBHOOK_TOKEN=e2e-sms-token EMAIL_CHECK_ALLOW_DOMAINS=e2e.example.com
export LOGISTICS_DOC_REMINDER_HOUR=25 CAB_SERVICE_ENABLED=true
exec node -r ./scripts/e2e/mock-providers.js simbaTasker.js
