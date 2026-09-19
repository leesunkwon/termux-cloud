#!/bin/bash

# ==============================================================================
#  ⚡  Pulse Server - 서버 중지 스크립트 (stop.sh)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
source "$SCRIPT_DIR/process.sh"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PID_FILE="$SCRIPT_DIR/.server.pid"
STOPPED=false

echo -e "${YELLOW}[*] Pulse 서버 프로세스를 정리합니다...${NC}"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null && pulse_pid_matches "$PID"; then
        kill "$PID" 2>/dev/null
        sleep 1
        # 아직 살아있으면 강제 종료
        if kill -0 "$PID" 2>/dev/null && pulse_pid_matches "$PID"; then
            kill -9 "$PID" 2>/dev/null
        fi
        echo -e "${GREEN}[✓] PID $PID 서버 프로세스가 종료되었습니다.${NC}"
        STOPPED=true
    fi
    rm -f "$PID_FILE"
fi

if [ "$STOPPED" = true ]; then
    echo -e "${GREEN}[✓] 서버가 완전히 종료되었습니다.${NC}"
else
    echo -e "${YELLOW}[!] 현재 실행 중인 서버 프로세스를 찾지 못했습니다.${NC}"
fi
