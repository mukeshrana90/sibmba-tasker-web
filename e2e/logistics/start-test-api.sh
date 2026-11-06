#!/bin/bash
# Test API on :4099 with SendGrid + Twilio replaced by a local outbox (scripts/e2e/mock-providers.js).
# Fake credentials make every send code path run; nothing leaves this machine.
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/../../../sibmba-tasker-backend"
export PORT=4099 MOCK_OUTBOX="$HERE/outbox.jsonl" MOCK_FAIL_TO='^\+9199999|^\+26371999|^fail\.'
export MOCK_FAIL_WA_TO='^\+9188888|^\+26371888'
export SEND_GRID_API_KEY=SG.e2e-fake SEND_GRID_SENDER=simbatasker.noreply@yopmail.com
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
# v2.7.61 templates (fake SIDs: the sends run through the mock, which checks them against logistics-wa-templates.json)
export LOGISTICS_WA_ACCOUNT_STATUS_TEMPLATE_SID=HXe2e0000000000000000accountstatus
export LOGISTICS_WA_DOC_REVIEW_TEMPLATE_SID=HXe2e0000000000000000000docreview
export LOGISTICS_WA_TRIAL_REMINDER_TEMPLATE_SID=HXe2e000000000000000trialreminder
export LOGISTICS_WA_BOOKING_REMINDER_TEMPLATE_SID=HXe2e00000000000000bookingreminder
export LOGISTICS_WA_FLEET_SUMMARY_TEMPLATE_SID=HXe2e000000000000000000fleetsummary
export LOGISTICS_WA_LOCATION_CHECK_TEMPLATE_SID=HXe2e00000000000000000locationcheck
# v2.7.61 switches, fixed here so the suite doesn't depend on .env. Reminder schedulers never start globally.
export LOGISTICS_WA_TRIAL_DAYS=60 LOGISTICS_TEST_PAID_PLAN_ENABLED=true LOGISTICS_TEST_ACCOUNTS_ENABLED=true
export LOGISTICS_ADMIN_SOS_PHONES=+263771000111
unset LOGISTICS_REMINDER_SCHEDULERS_ENABLED
# Straight-line distance in tests (no calls to the public OSRM router); priority fee USD 5
export LOGISTICS_ROAD_DISTANCE=false LOGISTICS_PRIORITY_FEE=5
export LOGISTICS_ADMIN_ALERT_EMAILS=simba.sosdesk@yopmail.com
export LOGISTICS_SOS_SMS_WEBHOOK_TOKEN=e2e-sms-token EMAIL_CHECK_ALLOW_DOMAINS=e2e.example.com,yopmail.com
export LOGISTICS_DOC_REMINDER_HOUR=25 CAB_SERVICE_ENABLED=true
exec node -r ./scripts/e2e/mock-providers.js simbaTasker.js
