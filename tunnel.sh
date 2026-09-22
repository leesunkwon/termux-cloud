#!/bin/bash
# ==============================================================================
#  ☁️  Pulse Cloud - Cloudflare Tunnel 관리 스크립트 (tunnel.sh)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

PID_FILE="$SCRIPT_DIR/.tunnel.pid"
URL_FILE="$SCRIPT_DIR/.tunnel.url"
LOG_FILE="$SCRIPT_DIR/tunnel.log"
PORT=${PORT:-3000}

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

check_cloudflared() {
    if command -v cloudflared &>/dev/null; then
        return 0
    fi

    echo -e "${RED}[!] cloudflared 바이너리가 설치되어 있지 않습니다.${NC}"
    if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ] || [ -n "$PREFIX" ]; then
        echo -e "${CYAN}[i] Termux 환경을 감지했습니다. 패키지 매니저로 자동 설치할 수 있습니다:${NC}"
        echo -e "    ${BOLD}pkg install cloudflared -y${NC}\n"
        if [ -t 0 ]; then
            read -p "지금 cloudflared를 설치하시겠습니까? (y/N): " -r ans
            if [[ "$ans" =~ ^[Yy]$ ]]; then
                echo -e "${YELLOW}[*] cloudflared 설치를 시작합니다...${NC}"
                pkg install cloudflared -y || {
                    echo -e "${RED}[!] cloudflared 설치에 실패했습니다.${NC}" >&2
                    return 1
                }
                return 0
            fi
        fi
    else
        echo -e "${YELLOW}[i] 설치 안내: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/${NC}"
    fi
    return 1
}

is_tunnel_running() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null || true)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        rm -f "$PID_FILE" "$URL_FILE" 2>/dev/null || true
    fi
    return 1
}

get_tunnel_url() {
    if [ -f "$URL_FILE" ]; then
        cat "$URL_FILE" 2>/dev/null
    fi
}

start_tunnel() {
    local bg=false
    local token=""
    local custom_port="$PORT"

    while [[ "$#" -gt 0 ]]; do
        case "$1" in
            --bg|-d|background)
                bg=true
                ;;
            --token|-t)
                token="$2"
                shift
                ;;
            --port|-p)
                custom_port="$2"
                shift
                ;;
        esac
        shift
    done

    if is_tunnel_running; then
        local current_pid
        current_pid=$(cat "$PID_FILE")
        local current_url
        current_url=$(get_tunnel_url)
        echo -e "${YELLOW}[i] Cloudflare Tunnel이 이미 실행 중입니다 (PID: ${current_pid}).${NC}"
        if [ -n "$current_url" ]; then
            echo -e "    ${BOLD}외부 접속 주소:${NC} ${CYAN}${current_url}${NC}"
        fi
        return 0
    fi

    check_cloudflared || exit 1

    # 토큰 환경변수 우선 적용
    if [ -z "$token" ] && [ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
        token="$CLOUDFLARE_TUNNEL_TOKEN"
    fi

    echo -e "${CYAN}======================================================${NC}"
    echo -e "${CYAN}  ☁️   Pulse Cloudflare Tunnel 외부 접속 시작          ${NC}"
    echo -e "${CYAN}======================================================${NC}"

    if [ -n "$token" ]; then
        echo -e "${GREEN}[*] 등록된 고정 도메인 토큰으로 터널을 실행합니다...${NC}"
        CMD=(cloudflared tunnel --protocol http2 run --token "$token")
    else
        echo -e "${GREEN}[*] 무료 Quick Tunnel(trycloudflare.com)을 생성합니다...${NC}"
        echo -e "    로컬 대상 포트: ${BOLD}http://127.0.0.1:${custom_port}${NC}"
        CMD=(cloudflared tunnel --protocol http2 --url "http://127.0.0.1:${custom_port}" --no-autoupdate)
    fi

    if [ "$bg" = true ]; then
        rm -f "$LOG_FILE" "$URL_FILE" 2>/dev/null || true
        nohup "${CMD[@]}" > "$LOG_FILE" 2>&1 &
        local pid=$!
        echo "$pid" > "$PID_FILE"

        echo -e "${YELLOW}[*] 터널 주소 발급 대기 중... (최대 15초)${NC}"
        local max_attempts=30
        local attempt=0
        local found_url=""

        while [ "$attempt" -lt "$max_attempts" ]; do
            if ! kill -0 "$pid" 2>/dev/null; then
                echo -e "${RED}[!] 터널 프로세스가 비정상 종료되었습니다. 로그를 확인하세요:${NC}"
                tail -n 15 "$LOG_FILE" 2>/dev/null || true
                rm -f "$PID_FILE" "$URL_FILE" 2>/dev/null || true
                return 1
            fi

            if [ -n "$token" ]; then
                # 토큰 모드는 trycloudflare URL이 아닌 고정 도메인이므로 성공 여부만 확인
                if grep -iqE "Registered tunnel connection|Connection [a-z0-9-]+ registered" "$LOG_FILE" 2>/dev/null; then
                    found_url="고정 도메인 터널 연결 완료 (Cloudflare Dashboard 설정 도메인)"
                    echo "$found_url" > "$URL_FILE"
                    break
                fi
            else
                # Quick Tunnel URL 파싱
                found_url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | tail -n 1 || true)
                if [ -n "$found_url" ]; then
                    echo "$found_url" > "$URL_FILE"
                    break
                fi
            fi

            sleep 0.5
            attempt=$((attempt + 1))
        done

        if [ -n "$found_url" ]; then
            echo -e "\n${GREEN}${BOLD}✓ Cloudflare Tunnel 외부 접속 주소가 활성화되었습니다!${NC}"
            echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo -e "  🌐 ${BOLD}외부(인터넷) 접속 주소:${NC} ${CYAN}${BOLD}${found_url}${NC}"
            echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo -e "  - 전 세계 어디서든 (LTE/5G/외부 Wi-Fi) 위 주소로 접속할 수 있습니다."
            echo -e "  - 터널 상태 확인: ${BOLD}termux-cloud status${NC} 또는 ${BOLD}./tunnel.sh status${NC}"
            echo -e "  - 터널 종료:     ${BOLD}./tunnel.sh stop${NC}"
        else
            echo -e "${YELLOW}[!] 터널이 백그라운드에서 실행되었으나 주소 파싱에 시간이 걸리고 있습니다.${NC}"
            echo -e "    PID: $pid. 로그 확인: ${BOLD}tail -f tunnel.log${NC}"
        fi
    else
        # Foreground mode
        rm -f "$URL_FILE" 2>/dev/null || true
        # Trap to clean up on Ctrl+C
        trap 'rm -f "$PID_FILE" "$URL_FILE" 2>/dev/null; exit 0' INT TERM EXIT
        echo "$$" > "$PID_FILE"
        exec "${CMD[@]}"
    fi
}

stop_tunnel() {
    echo -e "${YELLOW}[*] Cloudflare Tunnel 프로세스를 확인합니다...${NC}"
    local stopped=false

    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null || true)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            sleep 1
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null || true
            fi
            echo -e "${GREEN}✓ Cloudflare Tunnel(PID: $pid)이 안전하게 종료되었습니다.${NC}"
            stopped=true
        fi
        rm -f "$PID_FILE" "$URL_FILE" 2>/dev/null || true
    fi

    # pkill 백업 확인 (이 프로젝트 포트에 물린 cloudflared)
    if command -v pkill &>/dev/null; then
        pkill -f "cloudflared tunnel.*${PORT}" 2>/dev/null || true
    fi

    if [ "$stopped" = false ]; then
        echo -e "${CYAN}[i] 실행 중인 Cloudflare Tunnel 프로세스가 없습니다.${NC}"
    fi
}

status_tunnel() {
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${CYAN}  ☁️   Pulse Cloudflare Tunnel 가동 상태              ${NC}"
    echo -e "${CYAN}======================================================${NC}"

    if is_tunnel_running; then
        local pid
        pid=$(cat "$PID_FILE")
        local url
        url=$(get_tunnel_url)
        echo -e " 상태       : ${GREEN}${BOLD}● 가동 중 (RUNNING)${NC}"
        echo -e " PID        : ${pid}"
        if [ -n "$url" ]; then
            echo -e " 외부 주소  : ${CYAN}${BOLD}${url}${NC}"
        else
            echo -e " 외부 주소  : ${YELLOW}주소 확인 중 (tunnel.log 참조)${NC}"
        fi
        echo -e " 대상 포트  : http://127.0.0.1:${PORT}"
    else
        echo -e " 상태       : ${RED}○ 중지됨 (STOPPED)${NC}"
        echo -e " 시작 방법  : ${BOLD}./tunnel.sh start --bg${NC} 또는 ${BOLD}termux-cloud tunnel${NC}"
    fi
}

# ================= 메인 라우팅 =================
ACTION="${1:-start}"
if [ "$#" -gt 0 ]; then shift; fi

case "$ACTION" in
    start)
        start_tunnel "$@"
        ;;
    stop)
        stop_tunnel
        ;;
    status)
        status_tunnel
        ;;
    url)
        get_tunnel_url
        ;;
    --bg|-d|background)
        start_tunnel --bg "$@"
        ;;
    *)
        echo "사용법: $0 {start [--bg] [--token <TOKEN>] | stop | status | url}"
        exit 1
        ;;
esac
