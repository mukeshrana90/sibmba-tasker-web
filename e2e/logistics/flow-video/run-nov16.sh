#!/bin/bash
# Client field test proof videos (16 Nov 2026): fresh demo DB + demo API (:4099, messaging mocked), then record.
# Needs: web dev server :3001; admin dev server :3012 → :4099 (see ../s12-admin.js).
#   WORK_DIR=/some/tmp ./run-nov16.sh                    full recording → docs/logistics/videos/client-test-nov16/*.mp4
#   FAST=1 DEBUG_DIR=/some/tmp WORK_DIR=… ./run-nov16.sh  dry run (no recording)
#   ONLY=01,06 …                                          record only those parts
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
PID=$(ss -ltnp | grep ':4099 ' | grep -oP 'pid=\K[0-9]+' | head -1); [ -n "${PID:-}" ] && kill "$PID" && sleep 1
mkdir -p "$WORK_DIR"
: > ../flow-demo/outbox.jsonl
DB_URL=mongodb://localhost:27017/SimbaTaskerFlowDemo node ../flow-demo/seed-demo-db.js --reset >/dev/null
nohup ./start-api.sh > "$WORK_DIR/api.log" 2>&1 &
for i in $(seq 1 40); do curl -s -o /dev/null -m 2 http://127.0.0.1:4099/ && break; sleep 1; done
export DB_URL=mongodb://localhost:27017/SimbaTaskerFlowDemo MOCK_OUTBOX="$HERE/../flow-demo/outbox.jsonl"
node record-nov16.js; RC=$?
echo "exit $RC"; exit $RC
