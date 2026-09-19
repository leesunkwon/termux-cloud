#!/bin/bash

# ==============================================================================
#  ☁️  iCloud Personal Server - 실행 스크립트 (start.sh)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1
source "$SCRIPT_DIR/process.sh"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 파라미터 처리
BACKGROUND=false
AUTO_OPEN=false
PORT=${PORT:-3000}

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --bg|-d|background)
            BACKGROUND=true
            ;;
        --open|-o)
            AUTO_OPEN=true
            ;;
        --port|-p)
            PORT="$2"
            shift
            ;;
        *)
            ;;
    esac
    shift
done

export PORT
export PULSE_MANAGED=1

# 디렉토리 준비
mkdir -p uploads

# Termux 환경 감지 및 절전 방지 활성화
if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
    if command -v termux-wake-lock &>/dev/null; then
        termux-wake-lock 2>/dev/null || true
    fi
fi

# 로컬 IP 주소 탐색 함수
get_local_ip() {
    local ip=""
    # 1) ip route
    if command -v ip &>/dev/null; then
        ip=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $7; exit}')
    fi
    # 2) ifconfig wlan0
    if [ -z "$ip" ] && command -v ifconfig &>/dev/null; then
        ip=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
    fi
    # 3) python fallback
    if [ -z "$ip" ] && command -v python3 &>/dev/null; then
        ip=$(python3 -c "import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2>/dev/null)
    fi
    echo "${ip:-localhost}"
}

LOCAL_IP=$(get_local_ip)

# 기존 실행 중인 서버 프로세스 체크 (.server.pid 또는 포트)
PID_FILE="$SCRIPT_DIR/.server.pid"
if ! SERVER_PIDS=$(pulse_server_pids); then
    echo "서버 프로세스를 확인하지 못해 중복 실행을 방지하기 위해 시작을 중단합니다."
    exit 1
fi
if [ -n "$SERVER_PIDS" ]; then
    echo "$SERVER_PIDS" | head -n 1 > "$PID_FILE"
    echo "이미 Pulse 서버가 실행 중입니다 (PID: $SERVER_PIDS). ./stop.sh로 종료하세요."
    exit 0
fi
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if [[ "$OLD_PID" =~ ^[0-9]+$ ]] && kill -0 "$OLD_PID" 2>/dev/null; then
        if pulse_pid_matches "$OLD_PID"; then
            echo "이미 Pulse 서버가 실행 중입니다 (PID: $OLD_PID). ./stop.sh로 종료하세요."
            exit 0
        fi
        echo "기록된 PID의 프로젝트 소속을 확인하지 못했습니다. PID 파일을 보존하고 시작을 중단합니다."
        exit 1
    fi
    rm -f "$PID_FILE"
fi

# 실행 명령 결정
SERVER_CMD=()
if command -v python3 &>/dev/null; then
    # Flask 설치 확인
    if ! python3 -c "import flask" &>/dev/null; then
        echo -e "${CYAN}[*] Flask 설치 진행 중...${NC}"
        python3 -m pip install -r requirements.txt
    fi
    SERVER_CMD=(python3 "$SCRIPT_DIR/app.py")
elif command -v python &>/dev/null; then
    if ! python -c "import flask" &>/dev/null; then
        echo -e "${CYAN}[*] Flask 설치 진행 중...${NC}"
        python -m pip install -r requirements.txt
    fi
    SERVER_CMD=(python "$SCRIPT_DIR/app.py")

else
    echo -e "${RED}[!] 오류: Python 3가 설치되어 있지 않습니다.${NC}"
    echo "    설치 스크립트를 실행해주세요: ./install.sh"
    exit 1
fi

# 브라우저 자동 오픈 헬퍼
open_browser() {
    sleep 1.5
    local target_url="http://localhost:$PORT"
    if command -v termux-open-url &>/dev/null; then
        termux-open-url "$target_url" 2>/dev/null || true
    elif command -v xdg-open &>/dev/null; then
        xdg-open "$target_url" 2>/dev/null || true
    elif command -v open &>/dev/null; then
        open "$target_url" 2>/dev/null || true
    fi
}

# 배너 출력
echo -e "${CYAN}┌────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│${NC}  ${BOLD}⚡  Pulse (Pulse Cloud & Pulse OS) Server${NC}             ${CYAN}│${NC}"
echo -e "${CYAN}├────────────────────────────────────────────────────────┤${NC}"
echo -e "${CYAN}│${NC}  📱 스마트폰 자체 접속 : ${GREEN}${BOLD}http://localhost:${PORT}${NC}              ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}  💻 동일 와이파이 접속 : ${GREEN}${BOLD}http://${LOCAL_IP}:${PORT}${NC}           ${CYAN}│${NC}"
echo -e "${CYAN}└────────────────────────────────────────────────────────┘${NC}"

if [ "$AUTO_OPEN" = true ]; then
    open_browser &
fi

# 백그라운드 실행 모드
if [ "$BACKGROUND" = true ]; then
    echo -e "${BLUE}[*] 서버를 백그라운드(데몬) 모드로 시작합니다...${NC}"
    nohup "${SERVER_CMD[@]}" > "$SCRIPT_DIR/server.log" 2>&1 &
    NEW_PID=$!
    echo "$NEW_PID" > "$PID_FILE"
    sleep 1
    if kill -0 "$NEW_PID" 2>/dev/null; then
        echo -e "${GREEN}[✓] 서버가 백그라운드에서 성공적으로 구동 중입니다! (PID: $NEW_PID)${NC}"
        echo -e "    - 로그 확인 : ${CYAN}tail -f server.log${NC}"
        echo -e "    - 상태 확인 : ${CYAN}./status.sh${NC}"
        echo -e "    - 서버 중지 : ${CYAN}./stop.sh${NC}"
    else
        echo -e "${RED}[!] 서버 시작 실패. server.log를 확인해주세요:${NC}"
        cat "$SCRIPT_DIR/server.log"
        rm -f "$PID_FILE"
        exit 1
    fi
else
    # 포그라운드 실행 모드
    echo -e "${YELLOW}[*] 터미널을 닫지 마세요. 종료하려면 Ctrl+C를 누르세요.${NC}"
    echo -e "${YELLOW}    (백그라운드에서 실행하려면: ./start.sh --bg)${NC}\n"
    
    # PID 저장 및 트랩 설정
    "${SERVER_CMD[@]}" &
    SERVER_PID=$!
    echo "$SERVER_PID" > "$PID_FILE"
    
    trap "kill $SERVER_PID 2>/dev/null; rm -f '$PID_FILE'; echo -e '\n${YELLOW}[✓] 서버가 종료되었습니다.${NC}'; exit 0" INT TERM
    wait $SERVER_PID
    rm -f "$PID_FILE"
fi
