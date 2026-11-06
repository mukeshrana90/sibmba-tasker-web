#!/bin/bash
# Fresh demo DB + API, then record. Needs: web dev server :3001; admin dev server :3012 → :4099 (see ../s12-admin.js).
#   WORK_DIR=/some/tmp ./run.sh            full recording  →  docs/logistics/videos/*.mp4
#   FAST=1 DEBUG_DIR=/some/tmp WORK_DIR=… ./run.sh    dry run with step screenshots
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
PID=$(ss -ltnp | grep ':4099 ' | grep -oP 'pid=\K[0-9]+' | head -1); [ -n "${PID:-}" ] && kill "$PID" && sleep 1
node ../flow-demo/seed-demo-db.js --reset >/dev/null
nohup ./start-api.sh > "$WORK_DIR/api.log" 2>&1 &
API=$!
for i in $(seq 1 40); do curl -s -o /dev/null -m 2 http://127.0.0.1:4099/ && break; sleep 1; done
mkdir -p "$WORK_DIR"; export DB_URL=mongodb://localhost:27017/SimbaTaskerFlowDemo ZW_DOCS_DIR="$WORK_DIR/docs"
node record-flows.js; RC=$?
echo "exit $RC"; exit $RC
