#!/bin/bash

# ==============================================================================
#  ☁️  iCloud Personal Server - 서버 상태 확인 스크립트 (status.sh)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
source "$SCRIPT_DIR/process.sh"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

PID_FILE="$SCRIPT_DIR/.server.pid"
PORT=${PORT:-3000}

get_local_ip() {
    local ip=""
    if command -v python3 &>/dev/null; then
        ip=$(python3 -c "import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2>/dev/null)
    fi
    echo "${ip:-localhost}"
}

LOCAL_IP=$(get_local_ip)

RUNNING=false
SERVER_PID=""

if ! SERVER_PIDS=$(pulse_server_pids); then
    echo "서버 상태를 확인하지 못했습니다. 프로세스 조회 권한을 확인하세요."
    exit 1
fi
if [ -n "$SERVER_PIDS" ]; then
    SERVER_PID=$(echo "$SERVER_PIDS" | head -n 1)
    RUNNING=true
fi


echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}  ⚡   Pulse (Pulse Cloud & Pulse OS) Server 상태 점검  ${NC}"
echo -e "${CYAN}======================================================${NC}"

if [ "$RUNNING" = true ]; then
    echo -e " 상태       : ${GREEN}${BOLD}● 가동 중 (RUNNING)${NC}"
    echo -e " PID        : ${SERVER_PID}"
    echo -e " 스마트폰 주소: ${CYAN}http://localhost:${PORT}${NC}"
    echo -e " 와이파이 주소: ${CYAN}http://${LOCAL_IP}:${PORT}${NC}"
    
    # 프로세스 상세 정보 (메모리, CPU)
    if command -v ps &>/dev/null; then
        echo -e "\n${BOLD}[프로세스 자원 사용 현황]${NC}"
        ps -p "$SERVER_PID" -o pid,user,%cpu,%mem,time,command 2>/dev/null || ps aux | grep "$SERVER_PID" | grep -v grep
    fi
    
    # 최근 로그 5줄 출력 (server.log가 있는 경우)
    if [ -f "$SCRIPT_DIR/server.log" ]; then
        echo -e "\n${BOLD}[최근 로그 (server.log)]${NC}"
        tail -n 5 "$SCRIPT_DIR/server.log"
    fi
else
    echo -e " 상태       : ${RED}${BOLD}○ 정지됨 (STOPPED)${NC}"
    echo -e " 서버 시작  : ${CYAN}./start.sh${NC} 또는 ${CYAN}./start.sh --bg${NC}"
fi
echo -e "${CYAN}======================================================${NC}"
