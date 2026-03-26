#!/bin/bash
# AirSense - Start All Services
# Usage: ./start.sh [--dev] [--stop]

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON_SERVICE_DIR="$ROOT_DIR/services/analytics-service"
VENV_DIR="$PYTHON_SERVICE_DIR/venv"
PID_DIR="$ROOT_DIR/.pids"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

mkdir -p "$PID_DIR"

# ── Stop all services ──────────────────────────────────────────────
stop_services() {
  echo -e "${YELLOW}Stopping services...${NC}"

  if [ -f "$PID_DIR/analytics.pid" ]; then
    PID=$(cat "$PID_DIR/analytics.pid")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID" 2>/dev/null
      echo -e "  ${GREEN}✓${NC} Analytics service stopped (PID $PID)"
    fi
    rm -f "$PID_DIR/analytics.pid"
  fi

  if [ -f "$PID_DIR/nextjs.pid" ]; then
    PID=$(cat "$PID_DIR/nextjs.pid")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID" 2>/dev/null
      echo -e "  ${GREEN}✓${NC} Next.js stopped (PID $PID)"
    fi
    rm -f "$PID_DIR/nextjs.pid"
  fi

  echo -e "${GREEN}All services stopped.${NC}"
}

if [ "$1" = "--stop" ]; then
  stop_services
  exit 0
fi

# ── Pre-flight checks ─────────────────────────────────────────────
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  AirSense - Starting All Services${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check .env
if [ ! -f "$ROOT_DIR/.env" ]; then
  echo -e "${RED}✗ .env file not found. Copy .env.example and fill in API keys.${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} .env file found"

# Check node_modules
if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo -e "${YELLOW}  Installing npm dependencies...${NC}"
  cd "$ROOT_DIR" && npm install
fi
echo -e "  ${GREEN}✓${NC} Node dependencies ready"

# Check Python venv
if [ ! -d "$VENV_DIR" ]; then
  echo -e "${YELLOW}  Creating Python virtual environment...${NC}"
  python3 -m venv "$VENV_DIR"
  "$VENV_DIR/bin/pip" install --upgrade pip setuptools wheel -q
  "$VENV_DIR/bin/pip" install -r "$PYTHON_SERVICE_DIR/requirements.txt" -q
fi
echo -e "  ${GREEN}✓${NC} Python venv ready"

# Sync database
echo -e "  ${YELLOW}Syncing database...${NC}"
cd "$ROOT_DIR" && npx prisma db push --skip-generate 2>/dev/null
echo -e "  ${GREEN}✓${NC} Database synced"

echo ""

# ── Stop any existing services ─────────────────────────────────────
stop_services 2>/dev/null

echo ""

# ── Start Python Analytics Service (ARIMA + Fuzzy Logic) ──────────
echo -e "${CYAN}Starting Python Analytics Service (port 8001)...${NC}"
cd "$PYTHON_SERVICE_DIR"
"$VENV_DIR/bin/python" main.py > "$ROOT_DIR/.pids/analytics.log" 2>&1 &
ANALYTICS_PID=$!
echo "$ANALYTICS_PID" > "$PID_DIR/analytics.pid"

# Wait for it to be ready
for i in $(seq 1 15); do
  if curl -s http://127.0.0.1:8001/health >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Analytics service running (PID $ANALYTICS_PID)"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo -e "  ${RED}✗ Analytics service failed to start. Check .pids/analytics.log${NC}"
    cat "$PID_DIR/analytics.log" 2>/dev/null | tail -10
    exit 1
  fi
  sleep 1
done

# ── Start Next.js ─────────────────────────────────────────────────
echo -e "${CYAN}Starting Next.js (port 3000)...${NC}"
cd "$ROOT_DIR"

if [ "$1" = "--dev" ]; then
  npm run dev > "$PID_DIR/nextjs.log" 2>&1 &
else
  npm run dev > "$PID_DIR/nextjs.log" 2>&1 &
fi
NEXTJS_PID=$!
echo "$NEXTJS_PID" > "$PID_DIR/nextjs.pid"

# Wait for Next.js
for i in $(seq 1 30); do
  if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Next.js running (PID $NEXTJS_PID)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo -e "  ${RED}✗ Next.js failed to start. Check .pids/nextjs.log${NC}"
    cat "$PID_DIR/nextjs.log" 2>/dev/null | tail -10
    exit 1
  fi
  sleep 1
done

# ── Verify services ───────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Service Status${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

HEALTH=$(curl -s http://127.0.0.1:8001/health 2>/dev/null)
if echo "$HEALTH" | grep -q "analytics"; then
  echo -e "  ${GREEN}✓${NC} Analytics Service  →  http://127.0.0.1:8001  (ARIMA + Fuzzy Logic)"
else
  echo -e "  ${RED}✗${NC} Analytics Service  →  NOT RESPONDING"
fi

if curl -s http://localhost:3000 >/dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Next.js App        →  http://localhost:3000"
else
  echo -e "  ${RED}✗${NC} Next.js App        →  NOT RESPONDING"
fi

echo ""
echo -e "${GREEN}All services started successfully!${NC}"
echo -e "Open ${CYAN}http://localhost:3000${NC} in your browser."
echo ""
echo -e "To stop all services:  ${YELLOW}./start.sh --stop${NC}"
echo -e "Logs:  ${YELLOW}.pids/analytics.log${NC}  |  ${YELLOW}.pids/nextjs.log${NC}"
