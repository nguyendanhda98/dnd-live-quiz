#!/bin/bash

echo "=== MONITORING LOGS ==="
echo ""
echo "Starting log monitoring..."
echo "Please start your quiz now in the browser"
echo ""
echo "Press Ctrl+C to stop"
echo ""
echo "---------- WordPress Debug Log ----------"

tail -f /home/wordpress-da/html/wp-content/debug.log 2>/dev/null | grep -i "session\|websocket\|question" &
WP_PID=$!

echo ""
echo "---------- WebSocket Server Log ----------"

tail -f /home/wordpress-da/html/wp-content/plugins/dnd-live-quiz/websocket-server/logs/combined.log | grep -i "start-question\|question_start" &
WS_PID=$!

# Wait for user to press Ctrl+C
trap "kill $WP_PID $WS_PID 2>/dev/null; exit" INT

wait
