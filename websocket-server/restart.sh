#!/bin/bash

echo "========================================="
echo "Live Quiz WebSocket Server - Restart"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}Step 1: Checking for running processes...${NC}"
PIDS=$(pgrep -f "node.*server.js")

if [ -z "$PIDS" ]; then
    echo -e "${YELLOW}No running WebSocket server found${NC}"
else
    echo -e "${GREEN}Found running processes: $PIDS${NC}"
    echo -e "${YELLOW}Stopping processes...${NC}"
    pkill -f "node.*server.js"
    sleep 2
    
    # Check if still running
    PIDS=$(pgrep -f "node.*server.js")
    if [ ! -z "$PIDS" ]; then
        echo -e "${RED}Processes still running, force killing...${NC}"
        pkill -9 -f "node.*server.js"
        sleep 1
    fi
    
    echo -e "${GREEN}✓ Stopped successfully${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Starting WebSocket server...${NC}"

# Start server in background
nohup node server.js > websocket.log 2>&1 &
NEW_PID=$!

sleep 2

# Check if started successfully
if ps -p $NEW_PID > /dev/null; then
    echo -e "${GREEN}✓ WebSocket server started successfully${NC}"
    echo -e "${GREEN}  PID: $NEW_PID${NC}"
    echo ""
    
    # Test health endpoint
    echo -e "${YELLOW}Step 3: Testing health endpoint...${NC}"
    sleep 1
    
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✓ Health check passed${NC}"
        echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
    else
        echo -e "${RED}✗ Health check failed${NC}"
        echo "$HEALTH_RESPONSE"
    fi
    
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}WebSocket Server is now running!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "View logs: tail -f $SCRIPT_DIR/websocket.log"
    echo "Stop server: pkill -f 'node.*server.js'"
    echo ""
else
    echo -e "${RED}✗ Failed to start WebSocket server${NC}"
    echo ""
    echo "Check logs:"
    tail -20 websocket.log
    exit 1
fi

