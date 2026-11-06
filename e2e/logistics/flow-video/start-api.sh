#!/bin/bash
# API :4099 for the client flow videos: flow-demo's demo API (own DB, cab off, messaging mocked — nothing is
# sent, so yopmail inboxes stay empty) plus yopmail.com accepted and road distances for the Harare routes.
HERE="$(cd "$(dirname "$0")" && pwd)"
sed -e 's/moyohaulage.demo,mail.demo/yopmail.com/' -e 's/LOGISTICS_ROAD_DISTANCE=false/LOGISTICS_ROAD_DISTANCE=true/' \
    -e "s/sos-admin@e2e.example.com/admin.simba@yopmail.com/" -e "s#HERE=.*#HERE=\"$HERE/../flow-demo\"#" "$HERE/../flow-demo/start-demo-api.sh" | exec bash
